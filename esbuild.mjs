/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-undef */
import { build } from 'esbuild';
import { rimraf } from 'rimraf';

(async () => {
  // clear dist
  await rimraf('dist');

  // build
  await build({
    entryPoints: ['src/index.js'],
    bundle: true,
    // easier to debug, should be enabled in prod once local testing is in place
    minify: false,
    treeShaking: true,
    sourcemap: true,
    platform: 'node',
    target: 'node18',
    outdir: 'dist',
    outbase: 'src',
  });
})();
