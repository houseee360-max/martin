import { createRequire } from "module";
const require = createRequire("RUTA_DEL_PROYECTO/package.json");
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");
const B = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const [out, ...pairs] = process.argv.slice(2); // pares "comp:frame"
const serveUrl = await bundle({ entryPoint: "RUTA_DEL_PROYECTO/src/index.ts" });
const chromiumOptions = { gl: process.env.GL || "angle" };
for (const pr of pairs) {
  const [id, fr] = pr.split(":");
  const composition = await selectComposition({ serveUrl, id, browserExecutable: B, chromiumOptions, timeoutInMilliseconds: 180000 });
  await renderStill({ serveUrl, composition, frame: Number(fr), output: `${out}/${id}-${fr}.png`, browserExecutable: B, chromiumOptions, scale: 0.5, timeoutInMilliseconds: 180000 });
  console.log("ok", pr);
}
