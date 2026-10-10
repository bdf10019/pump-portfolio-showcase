import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{target:'es2022',outDir:'dist-reel',rollupOptions:{input:resolve(process.cwd(),'reel.html')}},preview:{host:'127.0.0.1',port:4172,strictPort:true}});
