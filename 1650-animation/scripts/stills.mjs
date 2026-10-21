// Render several stills from one bundle: node scripts/stills.mjs <composition> <outdir> <frame...>
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [comp, outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const inputProps = process.env.DEBUG ? {debug: true} : {};
const composition = await selectComposition({serveUrl, id: comp, inputProps, browserExecutable: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
for (const f of frames) {
  await renderStill({
    serveUrl,
    composition,
    frame: Number(f),
    inputProps,
    output: path.join(outDir, `${comp}_${f}.jpg`),
    imageFormat: 'jpeg',
    browserExecutable: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  });
  console.log('frame', f);
}
