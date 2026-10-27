import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { listRows } from "./list-rows.mjs";
const base = process.env.NEURONEST_API_URL ?? "http://127.0.0.1:8000";
const token = process.env.NEURONEST_ACCESS_TOKEN;
assert.ok(
  token,
  "Set NEURONEST_ACCESS_TOKEN to a confirmed Firebase ID token before running this check.",
);
const headers = { Authorization: `Bearer ${token}` };
async function json(path) {
  const response = await fetch(`${base}${path}`, { headers });
  const body = await response.json();
  assert.ok(
    response.ok,
    `${path}: ${response.status} ${JSON.stringify(body).slice(0, 180)}`,
  );
  return body;
}

const readiness = await fetch(`${base}/v1/readiness/`).then((r) => r.json());
assert.ok(readiness.capabilities, "Core readiness capabilities are missing.");
const children = listRows(await json("/v1/children/"));
const childId = process.env.NEURONEST_CHILD_ID ?? children[0]?.id;
const child = children.find((item) => item.id === childId);
assert.ok(
  child,
  "Create a child profile, or set NEURONEST_CHILD_ID to one visible to this confirmed account.",
);
const timings = [],
  started = performance.now();
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let i = 0; i < 10; i++) {
      const t = performance.now();
      const response = await fetch(`${base}/v1/records/?child=${child.id}`, {
        headers,
      });
      assert.equal(response.status, 200);
      assert.ok(response.headers.get("cache-control")?.includes("no-store"));
      const recordRows = listRows(await response.json());
      assert.ok(recordRows.every((row) => row.child === child.id));
      timings.push(performance.now() - t);
    }
  }),
);
timings.sort((a, b) => a - b);
console.log(
  `PASS: 80 authorized record reads / 8 concurrent clients in ${((performance.now() - started) / 1000).toFixed(2)}s; p50=${timings[39].toFixed(0)}ms p95=${timings[75].toFixed(0)}ms max=${timings.at(-1).toFixed(0)}ms; no child-scope leakage or HTTP failures.`,
);
console.log(
  "Local bounded concurrency smoke only; production capacity, endurance and rate-limit qualification remain deployment-specific.",
);
