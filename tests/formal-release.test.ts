import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {INTRO_VERSION} from '../src/intro-contract';
import {REEL_VERSION,A_URL,DURATION,INTRO_DURATION} from '../src/reel-contract';

describe('桌機本機正式版標記',()=>{
 it('兩站正式狀態與既有版本一致',()=>{
  const status=JSON.parse(readFileSync('release-status.json','utf8'));
  expect(status.status).toBe('formal-local-desktop');
  expect(status.aVersion).toBe(INTRO_VERSION);expect(status.bVersion).toBe(REEL_VERSION);
  for(const path of ['intro-candidate.html','reel.html'])expect(readFileSync(path,'utf8')).toContain('data-release="formal-local-desktop"');
 });
 it('去除訪客候選文案，不變更路由或播放長度',()=>{
  const html=readFileSync('intro-candidate.html','utf8');
  expect(html).toContain('<title>循環之內｜三作品互動介紹</title>');
  expect(html).toContain('桌機本機正式版 · 高亮是觀察焦點，不是故障確診');
  expect(readFileSync('src/intro-story.ts','utf8')).not.toContain("status.textContent='桌機候選'");
  expect(A_URL).toContain('intro-candidate.html?v=0.4.0#intro');
  expect(INTRO_DURATION).toBe(7);expect(DURATION).toBeCloseTo(37.166666,5);
 });
 it('正式範圍不誤稱公開部署或核心產品完成',()=>{
  const status=JSON.parse(readFileSync('release-status.json','utf8'));
  expect(status.publicDeployment).toBe(false);expect(status.coreProductsChanged).toBe(false);
  expect(status.visualAndTimingUnchanged).toBe(true);
  expect(status.scope).toContain('不代表三個核心產品已達生產部署標準');
  expect(status.limitations.length).toBeGreaterThanOrEqual(5);
 });
});
