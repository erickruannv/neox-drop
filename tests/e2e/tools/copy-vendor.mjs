// Copia ativos de node_modules para app/static/dist (gerado, fora do Git).
import { cpSync, mkdirSync } from "node:fs";

const out = "app/static/dist";
const copies = [
  ["node_modules/@google/model-viewer/dist/model-viewer.min.js", `${out}/vendor/model-viewer.min.js`],
  ["node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2", `${out}/fonts/archivo-latin-wdth-normal.woff2`],
  ["node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-italic.woff2", `${out}/fonts/archivo-latin-wdth-italic.woff2`],
];
mkdirSync(`${out}/vendor`, { recursive: true });
mkdirSync(`${out}/fonts`, { recursive: true });
for (const [from, to] of copies) cpSync(from, to);
console.log(`vendor: ${copies.length} arquivos em ${out}`);
