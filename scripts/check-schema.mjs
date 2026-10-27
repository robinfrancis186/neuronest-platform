import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const schema = JSON.parse(
  await readFile(
    new URL("../packages/contracts/openapi.json", import.meta.url),
    "utf8",
  ),
);
const required = [
  "/v1/children/",
  "/v1/records/",
  "/v1/parent-questionnaires/",
  "/v1/grants/",
  "/v1/appointments/",
  "/v1/payments/",
  "/v1/payment-demo/",
  "/v1/payment-demo/{order_id}/",
  "/v1/assistant/",
  "/v1/assistant-guide/",
  "/v1/screenings/instruments/",
  "/v1/readiness/",
  "/v1/auth/identity/link/",
  "/v1/exports/",
  "/v1/preferences/",
  "/v1/messages/recipients/",
  "/v1/guardianships/{id}/accept/",
  "/v1/privacy-requests/{id}/review/",
  "/v1/privacy-requests/{id}/accept/",
  "/v1/privacy-requests/{id}/execute/",
  "/v1/operations/",
  "/v1/policies/",
];
const removed = [
  "/v1/dev/accounts/",
  "/v1/dev/session/",
  "/v1/payments/{id}/simulate/",
];
for (const path of required)
  assert.ok(schema.paths[path], `Missing public API contract: ${path}`);
for (const path of removed)
  assert.equal(schema.paths[path], undefined, `Removed demo route remains: ${path}`);
const bearer = Object.values(schema.components.securitySchemes ?? {}).find(
  (item) => item.type === "http" && item.scheme === "bearer",
);
assert.ok(bearer, "Bearer security scheme is required.");
assert.match(
  bearer.description ?? "",
  /Firebase or Supabase access JWT/i,
  "The public contract must describe configured identity authentication.",
);
const identityLink = schema.paths["/v1/auth/identity/link/"]?.post;
assert.deepEqual(identityLink?.security, [{ BearerAuth: [] }]);
assert.equal(
  identityLink?.responses?.["409"]?.content?.["application/json"]?.schema?.$ref,
  "#/components/schemas/FirebaseIdentityLinkReviewRequired",
  "The Firebase identity-link review gate must remain explicit in the public contract.",
);
assert.match(
  schema.paths["/v1/auth/username/sign-in/"]?.post?.description ?? "",
  /Durably rate-limited parent-only username-to-Firebase-custom-token/i,
  "The username bridge contract must retain its durable generic-failure behavior.",
);
const types = await readFile(
  new URL("../packages/contracts/api.d.ts", import.meta.url),
  "utf8",
);
for (const path of required)
  assert.ok(types.includes(`"${path}"`), `Generated client missing ${path}`);
for (const path of removed)
  assert.ok(
    !types.includes(`"${path}"`),
    `Removed demo route remains in client: ${path}`,
  );
console.log(
  `API schema covers ${Object.keys(schema.paths).length} routes, including all critical integration entrypoints.`,
);
