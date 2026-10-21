// node scripts/export-keyframes.mjs  -> transcripts/keyframes-plan.json
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';

await build({
  entryPoints: ['scripts/keyframes-entry.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  outfile: 'out/keyframes-entry.cjs',
  loader: {'.json': 'json'},
  logLevel: 'error',
});
execFileSync('node', ['out/keyframes-entry.cjs', 'transcripts/keyframes-plan.json'], {stdio: 'inherit'});
