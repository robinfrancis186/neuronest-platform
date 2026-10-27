# Shared API contract

The core API exports `openapi.json`; `npm run contracts` generates `api.d.ts` with openapi-typescript. The generated types describe the real server endpoints; do not edit them by hand. `npm run check:contracts` fails when types drift from the schema.

Export from the core using `python manage.py spectacular --file ../../packages/contracts/openapi.json --format openapi-json`, then generate the TypeScript contract from the repository root.
