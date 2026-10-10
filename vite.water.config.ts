import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{outDir:'dist-water',sourcemap:true,rollupOptions:{input:resolve(process.cwd(),'water-layout.html')}},server:{host:'127.0.0.1',port:4175,strictPort:true},preview:{host:'127.0.0.1',port:4175,strictPort:true}});
