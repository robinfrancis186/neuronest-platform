import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const schemaPath = resolve("packages/contracts/openapi.json");
const outputPath = resolve("packages/contracts/api.d.ts");
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
if (!schema.openapi?.startsWith("3.") || !Object.keys(schema.paths ?? {}).length) {
  throw new Error("Export the real core OpenAPI schema before generating API types.");
}
const contents = astToString(await openapiTS(schema));
if (process.argv.includes("--check")) {
  if ((await readFile(outputPath, "utf8")) !== contents) {
    throw new Error(
      "API types are stale. Run npm run contracts after exporting the core schema.",
    );
  }
  console.log("OpenAPI types match the checked-in core contract.");
} else {
  await writeFile(outputPath, contents);
  console.log("Generated packages/contracts/api.d.ts from the core OpenAPI schema.");
}
