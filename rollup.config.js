import { babel } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { binary2base64 } from 'rollup-plugin-binary2base64';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
  },
  plugins: [
    json(),
    binary2base64({
      include: ['**/*.node'],
    }),
    nodeResolve({
      jsnext: true,
      preferBuiltins: true,
      browser: true,
    }),
    babel({ babelHelpers: 'bundled' }),
    commonjs(),
  ],
};
