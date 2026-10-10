import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{target:'es2022',outDir:'dist-scroll',sourcemap:true,rollupOptions:{input:[resolve(process.cwd(),'scroll-candidate.html'),resolve(process.cwd(),'scroll-acceptance.html'),resolve(process.cwd(),'scroll-network.html')]}},preview:{host:'127.0.0.1',port:4174,strictPort:true}});
