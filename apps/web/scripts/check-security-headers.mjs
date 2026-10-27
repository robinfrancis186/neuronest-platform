import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://checkout.razorpay.com https://cdn.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.razorpay.com https://i.ytimg.com; font-src 'self'; connect-src 'self' https://neuronest-core.vercel.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://apis.google.com https://www.googleapis.com https://www.google.com/recaptcha/ https://api.razorpay.com https://*.livekit.cloud wss://*.livekit.cloud; media-src 'self' blob:; worker-src 'self' blob:; frame-src https://neuronest-b383b.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://www.youtube-nocookie.com https://checkout.razorpay.com https://api.razorpay.com; manifest-src 'self'";

const expected = {
  "Content-Security-Policy": csp,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), usb=()",
};

for (const configPath of ["../../../vercel.json", "../vercel.json"]) {
  const config = JSON.parse(readFileSync(new URL(configPath, import.meta.url), "utf8"));
  const rule = config.headers?.find(({ source }) => source === "/(.*)");
  assert.ok(rule, `${configPath} protects every SPA route`);
  assert.deepEqual(
    Object.fromEntries(rule.headers.map(({ key, value }) => [key, value])),
    expected,
    `${configPath} keeps the deployed security headers aligned`,
  );
}

const connectSources = csp
  .split("; ")
  .find((directive) => directive.startsWith("connect-src "))
  .split(" ")
  .slice(1);
assert.ok(!connectSources.includes("https:"), "CSP does not allow arbitrary HTTPS");
