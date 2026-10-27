import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { chromium } = require("playwright");
const api = process.env.NEURONEST_API_URL ?? "http://127.0.0.1:8000";
function required(name) {
  const value = process.env[name];
  assert.ok(value, `Set ${name} before running this check.`);
  return value;
}

assert.equal(
  process.env.NEURONEST_VIDEO_QA,
  "1",
  "Set NEURONEST_VIDEO_QA=1 only for a dedicated non-clinical QA appointment.",
);
const appointmentId = required("NEURONEST_APPOINTMENT_ID");
const parentToken = required("NEURONEST_PARENT_ACCESS_TOKEN");
const doctorToken = required("NEURONEST_DOCTOR_ACCESS_TOKEN");

async function join(token) {
  const response = await fetch(`${api}/v1/appointments/${appointmentId}/join/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await response.json();
  assert.ok(response.ok, `Could not join QA appointment: ${response.status}`);
  return body;
}

const [parentRoom, doctorRoom] = await Promise.all([
  join(parentToken),
  join(doctorToken),
]);
assert.equal(
  parentRoom.room,
  doctorRoom.room,
  "Participants must receive the same room.",
);
assert.equal(parentRoom.recording, false, "Recording must be disabled by default.");
assert.equal(doctorRoom.recording, false, "Recording must be disabled by default.");

const sdk = await readFile(
  new URL(
    "../apps/web/node_modules/livekit-client/dist/livekit-client.umd.js",
    import.meta.url,
  ),
);
const server = createServer((request, response) => {
  response.setHeader(
    "Content-Type",
    request.url === "/sdk.js" ? "text/javascript" : "text/html",
  );
  response.end(
    request.url === "/sdk.js"
      ? sdk
      : '<!doctype html><title>NeuroNest video QA</title><script src="/sdk.js"></script><main>Non-clinical video QA</main>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chrome) ? { executablePath: chrome } : {}),
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const pages = [];
  for (const credentials of [parentRoom, doctorRoom]) {
    const context = await browser.newContext({ permissions: ["camera", "microphone"] });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.evaluate(async ({ url, token }) => {
      window.states = [];
      window.room = new LivekitClient.Room();
      room.on(LivekitClient.RoomEvent.ConnectionStateChanged, (state) =>
        states.push(state),
      );
      await room.connect(url, token);
      await room.localParticipant.enableCameraAndMicrophone();
    }, credentials);
    pages.push(page);
  }
  async function hasMedia(page) {
    await page.waitForFunction(
      async () => {
        if (room.remoteParticipants.size !== 1) return false;
        for (const participant of room.remoteParticipants.values()) {
          let audio = false;
          let video = false;
          for (const publication of participant.trackPublications.values()) {
            const report = await publication.track?.getRTCStatsReport();
            report?.forEach((stat) => {
              if (
                stat.type === "inbound-rtp" &&
                stat.kind === "video" &&
                stat.framesDecoded > 0
              )
                video = true;
              if (
                stat.type === "inbound-rtp" &&
                stat.kind === "audio" &&
                stat.bytesReceived > 0
              )
                audio = true;
            });
          }
          if (!audio || !video) return false;
        }
        return true;
      },
      null,
      { timeout: 45000 },
    );
  }
  await Promise.all(pages.map(hasMedia));
  await pages[0].evaluate(() => room.simulateScenario("signal-reconnect"));
  await pages[0].waitForFunction(
    () =>
      room.state === "connected" &&
      states.some(
        (state) => state === "signalReconnecting" || state === "reconnecting",
      ),
    null,
    { timeout: 30000 },
  );
  await hasMedia(pages[0]);
  console.log(
    "PASS: two authorized QA participants exchanged audio/video and recovered signaling.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
