import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {SLICES,partFrame} from '../src/intro-contract';
describe('03-3 白話文案',()=>{
 it('清楚區分觀察與安全確認並說明三作品分工',()=>{
  const html=readFileSync('intro-candidate.html','utf8'),section=html.split('id="observe-safety"')[1].split('</section>')[0];
  expect(section).toContain('03-3 · 確認觀察');
  expect(section).toContain('未發現危害，<br>仍需確認狀態。');
  expect(section).toContain('不代表已確認安全');
  expect(section).toContain('作品二經核准執行');
  expect(section).toContain('作品三整理檢查與維修文件');
  expect(section).toContain('三作品獨立運作');
  expect(section).not.toContain('不把沒有發生的事故畫出來');
  expect(SLICES.at(-1)?.title).toBe('未發現危害，仍需確認狀態。');
 });
 it('文案更換不改安全片無閃爍與收攏行為',()=>{
  const frame=partFrame('safety',1);expect(frame.pulse).toBe(false);expect(frame.explode).toBe(0);
  expect(frame.labels).toEqual(['mechanical_seal','motor']);
 });
});
