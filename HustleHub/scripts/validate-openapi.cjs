const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const source = fs.readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8');
const spec = YAML.parse(source);
if (spec?.openapi !== '3.0.3' || !spec.info?.title || !spec.paths || !spec.components?.schemas) {
  throw new Error('OpenAPI document is missing required top-level fields.');
}
for (const [route, operations] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(operations)) {
    if (!['get', 'post', 'patch', 'delete'].includes(method)) continue;
    if (!operation.responses || !Object.keys(operation.responses).length) throw new Error(`${method.toUpperCase()} ${route} has no responses.`);
  }
}
console.log(`OpenAPI ${spec.openapi} valid: ${Object.keys(spec.paths).length} paths documented.`);
