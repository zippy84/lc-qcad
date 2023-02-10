import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import buble from '@rollup/plugin-buble';

// https://buble.surge.sh
// https://rollupjs.org

const plugins = [
  nodeResolve(),
  commonjs(),
  buble({transforms: {dangerousForOf: true}, objectAssign: 'Object.assign'})
];

export default [
  {
    input: 'index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs'
    },
    plugins
  },
  {
    input: 'mkd_converter/convert.js',
    output: {
      file: 'mkd_converter/dist/convert.js',
      format: 'cjs'
    },
    plugins
  },
];
