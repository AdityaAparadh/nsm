import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const root = process.cwd();
const openapiPath = path.join(root, "openapi.yaml");
const outDir = path.join(root, "docs");
const outFile = path.join(outDir, "index.html");

async function main() {
  if (!fs.existsSync(openapiPath)) {
    console.error("openapi.yaml not found at", openapiPath);
    process.exit(1);
  }

  const data = fs.readFileSync(openapiPath, "utf8");
  let doc: any;
  try {
    doc = yaml.load(data);
  } catch (err) {
    console.error("Failed to parse openapi.yaml:", err);
    process.exit(1);
  }

  const jsonText = JSON.stringify(doc, null, 2);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
    <style>body{margin:0;padding:0}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
    <script>
      const spec = ${jsonText};
      window.ui = SwaggerUIBundle({
        spec,
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`;

  fs.writeFileSync(outFile, html, "utf8");
  console.log("Wrote", outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
