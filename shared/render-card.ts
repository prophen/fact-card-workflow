import satori from 'satori'
import {Resvg, initWasm} from '@resvg/resvg-wasm'
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {cardFont} from './card-font'

export const cardTemplate = 'defaultFactCard'
let wasmReady: Promise<void> | undefined

/** Text is laid out as SVG paths before rasterizing; no AI image generation. */
export async function renderCard(factText: string, template = cardTemplate): Promise<Buffer> {
  if (template !== cardTemplate) throw new Error(`Unsupported card template: ${template}`)
  if (!factText.trim() || factText.length > 280) throw new Error('Card fact must be 1–280 characters.')
  wasmReady ||= readFile(join(dirname(createRequire(import.meta.url).resolve('@resvg/resvg-wasm')), 'index_bg.wasm')).then(initWasm)
  await wasmReady
  const label = (text: string) => ({
    type: 'div',
    props: {style: {color: '#d4af37', fontSize: 24, letterSpacing: 4}, children: text},
  })
  const svg = await satori({
    type: 'div',
    props: {
      style: {
        width: 1080, height: 1080, backgroundColor: '#1a1a1a', color: '#ffffff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        alignItems: 'center', padding: 80, textAlign: 'center', fontFamily: 'Card Serif',
      },
      children: [
        label('CALIFORNIA BLACK STORIES'),
        {type: 'div', props: {style: {fontSize: 56, lineHeight: 1.4, fontWeight: 700}, children: factText}},
        label('DID YOU KNOW?'),
      ],
    },
  } as Parameters<typeof satori>[0], {
    width: 1080, height: 1080,
    fonts: [{name: 'Card Serif', data: cardFont, weight: 700, style: 'normal'}],
  })
  const renderer = new Resvg(svg)
  const rendered = renderer.render()
  try { return Buffer.from(rendered.asPng()) }
  finally { rendered.free(); renderer.free() }
}
