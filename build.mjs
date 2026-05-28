import * as esbuild from "esbuild";
import { readFileSync, readdirSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { optimize } from "svgo";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const svgDir = join(ROOT, "src/svgs");

// Build a map of minified SVG content keyed by filename for inlining at build time
const svgMap = {};
for (const f of readdirSync(svgDir).filter((f) => f.endsWith(".svg"))) {
  const raw = readFileSync(join(svgDir, f), "utf-8");
  svgMap[f] = optimize(raw, { path: join(svgDir, f) }).data;
}

// esbuild plugin: replaces runtime fetch() of SVG files with inlined string data
const svgInlinePlugin = {
  name: "svg-inline",
  setup(build) {
    build.onLoad({ filter: /emulator-viewer\.mjs$/ }, (args) => {
      let src = readFileSync(args.path, "utf-8");

      src = src.replace(
        "const BASE_URL = new URL('.', import.meta.url).href;",
        `const __SVG_MAP__ = ${JSON.stringify(svgMap)};`
      );

      src = src.replace(
        /const svgUrl = new URL\(config\.svgFile,\s*BASE_URL\)\.href;\s*const res = await fetch\(svgUrl\);\s*const svgText = await res\.text\(\);/,
        "const svgText = __SVG_MAP__[config.svgFile.replace('svgs/', '')];"
      );

      return { contents: src, loader: "js" };
    });
  },
};

mkdirSync(join(ROOT, "dist"), { recursive: true });

await esbuild.build({
  entryPoints: [join(ROOT, "src/index.mjs")],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: join(ROOT, "dist/pio.min.mjs"),
  plugins: [svgInlinePlugin],
  external: ["@julusian/midi"],
});

console.log("dist/pio.min.mjs generated.");
