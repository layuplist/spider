import { babel } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.cjs',
    format: 'cjs',
  },
  plugins: [
    json(),
    nodeResolve({
      jsnext: true,
      preferBuiltins: true,
      browser: true,
    }),
    babel({ babelHelpers: 'bundled' }),
    commonjs(),
  ],
};
