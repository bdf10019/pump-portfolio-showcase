import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{target:'es2022',outDir:'dist-intro',sourcemap:true,rollupOptions:{input:resolve(process.cwd(),'intro-candidate.html')}},preview:{host:'127.0.0.1',port:4173,strictPort:true}});
