import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {CANDIDATE_VERSION,SLICES} from '../src/scroll-contract';
const html=readFileSync('scroll-candidate.html','utf8');
describe('F1 候選隔離與語意',()=>{
 it('七片具名定位、三章、一個畫布，沒有劇情切換按鈕',()=>{
  expect(html.match(/<article /g)).toHaveLength(3);expect(html.match(/<canvas /g)).toHaveLength(1);expect(html.match(/<section [^>]*data-slice=/g)).toHaveLength(7);
  expect(html.match(/<button /g)).toHaveLength(1);for(const slice of SLICES)expect(html).toContain(`id="${slice.id}"`);
  expect(html).not.toContain('data-signal=');expect(html).not.toContain('data-route-phase=');
 });
 it('標示候選版本與未確診限制，不改正式建置輸入',()=>{
  expect(html).toContain(`data-version="${CANDIDATE_VERSION}"`);expect(html).toContain('觀察高亮不等於確診故障');
  expect(readFileSync('vite.config.ts','utf8')).not.toContain('scroll-candidate.html');expect(readFileSync('vite.scroll.config.ts','utf8')).toContain("outDir:'dist-scroll'");
 });
 it('協調器只讀捲動，不劫持滾輪或建立訊號 click handler',()=>{
  const source=readFileSync('src/scroll-story.ts','utf8');expect(source).toContain("window.addEventListener('scroll',schedule,{passive:true})");expect(source).not.toContain('preventDefault');expect(source).not.toContain('pointermove');expect(source).toContain('scrollNarrative:narrativeFrame');
 });
 it('保留安全否定、無 JavaScript 與靜態零件清單',()=>{
  expect(html).toContain('未發現不等於證實安全');expect(html).toContain('<noscript>');expect(html.match(/class="part-context"/g)).toHaveLength(3);
 });
});
