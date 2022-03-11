import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import buble from '@rollup/plugin-buble';

// https://buble.surge.sh
// https://rollupjs.org

export default {
  input: 'index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    buble({transforms: {dangerousForOf: true}, objectAssign: 'Object.assign'})
  ]
};
