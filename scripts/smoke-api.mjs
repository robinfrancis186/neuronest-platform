import assert from "node:assert/strict";
import { listRows } from "./list-rows.mjs";

const base = process.env.NEURONEST_API_URL ?? "http://127.0.0.1:8000";
const token = process.env.NEURONEST_ACCESS_TOKEN;
assert.ok(
  token,
  "Set NEURONEST_ACCESS_TOKEN to a confirmed Firebase ID token before running this check.",
);

async function request(path, { authenticated = true, method = "GET" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? { Authorization: `Bearer ${token}` } : {},
  });
  const content = await response.text();
  let body;
  try {
    body = JSON.parse(content);
  } catch {
    body = content;
  }
  return { status: response.status, body };
}

async function ok(path, options = {}) {
  const result = await request(path, options);
  assert.ok(
    result.status >= 200 && result.status < 300,
    `${options.method ?? "GET"} ${path}: ${result.status} ${JSON.stringify(result.body).slice(0, 300)}`,
  );
  return result.body;
}

const health = await ok("/health/", { authenticated: false });
assert.equal(health.status, "ok");
const readiness = await ok("/v1/readiness/", { authenticated: false });
assert.ok(readiness.capabilities, "Core readiness capabilities are missing.");
const unauthenticated = await request("/v1/me/", { authenticated: false });
assert.equal(
  unauthenticated.status,
  401,
  "Core must reject requests without a bearer token.",
);

const account = await ok("/v1/me/");
assert.ok(
  account.id && account.email,
  "Confirmed Firebase user was not provisioned locally.",
);
const children = listRows(await ok("/v1/children/"));
for (const child of children) {
  const records = listRows(await ok(`/v1/records/?child=${child.id}`));
  assert.ok(records.every((record) => record.child === child.id));
}
for (const route of [
  "preferences",
  "notifications",
  "content",
  "resources",
  "screenings/instruments",
])
  await ok(`/v1/${route}/`);

console.log(
  `PASS: confirmed Firebase account, ${children.length} authorized child scope(s), and read-only core paths are available without demo routes.`,
);
