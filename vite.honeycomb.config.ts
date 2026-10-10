import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{target:'es2022',outDir:'dist-honeycomb',copyPublicDir:false,rollupOptions:{input:resolve(process.cwd(),'honeycomb.html')}},preview:{host:'127.0.0.1',port:4171,strictPort:true}});
