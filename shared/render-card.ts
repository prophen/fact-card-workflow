import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import nodeModule from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cardFont } from "./card-font";

export const cardTemplate = "defaultFactCard";
let wasmReady: Promise<void> | undefined;

/** Text is laid out as SVG paths before rasterizing; no AI image generation. */
export async function renderCard(
  factText: string,
  template = cardTemplate,
): Promise<Buffer> {
  if (template !== cardTemplate)
    throw new Error(`Unsupported card template: ${template}`);
  if (!factText.trim() || factText.length > 400)
    throw new Error("Card fact must be 1–400 characters.");
  // Resolve with Node at runtime. Webpack turns import.meta-based require.resolve
  // into a numeric module ID, which is not a filesystem path.
  const runtimeRequire = Reflect.apply(nodeModule.createRequire, undefined, [
    join(process.cwd(), "package.json"),
  ]) as ReturnType<typeof nodeModule.createRequire>;
  wasmReady ||= readFile(
    runtimeRequire.resolve("@resvg/resvg-wasm/index_bg.wasm"),
  ).then(initWasm);
  await wasmReady;
  const label = (text: string) => ({
    type: "div",
    props: {
      style: { color: "#d4af37", fontSize: 24, letterSpacing: 4 },
      children: text,
    },
  });
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: 1080,
          height: 1080,
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 80,
          textAlign: "center",
          fontFamily: "Card Serif",
        },
        children: [
          label("CALIFORNIA BLACK STORIES"),
          {
            type: "div",
            props: {
              style: {
                fontSize: factText.length > 280 ? 44 : 56,
                lineHeight: 1.4,
                fontWeight: 700,
              },
              children: factText,
            },
          },
          label("DID YOU KNOW?"),
        ],
      },
    } as Parameters<typeof satori>[0],
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "Card Serif", data: cardFont, weight: 700, style: "normal" },
      ],
    },
  );
  const renderer = new Resvg(svg);
  const rendered = renderer.render();
  try {
    return Buffer.from(rendered.asPng());
  } finally {
    rendered.free();
    renderer.free();
  }
}
