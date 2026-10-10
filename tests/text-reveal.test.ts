import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {splitGraphemes,revealDelays,wrapUnits,TEXT_REVEAL,entryAction} from '../src/text-reveal';
describe('已確認逐字浮現效果接入',()=>{
 it('繁體、組合字與 emoji 保持完整',()=>{expect(splitGraphemes('水泵 e\u0301 👩‍🔧')).toEqual(['水','泵',' ','e\u0301',' ','👩‍🔧']);});
 it('標題 85ms、內文 45ms，720ms 上浮去模糊',()=>{expect(revealDelays(3,true)).toEqual([180,265,350]);expect(revealDelays(3,false)).toEqual([650,695,740]);expect(TEXT_REVEAL.duration).toBe(720);});
 it('長段落控制總延遲，錯誤數值與空文可用',()=>{expect(revealDelays(100,false).at(-1)).toBe(2450);expect(revealDelays(0,true)).toEqual([]);expect(revealDelays(NaN,false)).toEqual([]);});
 it('英文單字與中文標點避頭尾，字串不改寫',()=>{const text='AI 模型（葉輪），MLOps。';const units=wrapUnits(splitGraphemes(text));expect(units.flat().join('')).toBe(text);expect(units.map(x=>x.join(''))).toEqual(['AI',' ','模','型','（葉','輪），','MLOps。']);});
 it('回捲重入會重播，同幕停留不重播',()=>{expect(entryAction('intro','hero',false)).toBe('replay');expect(entryAction('hero','intro',false)).toBe('replay');expect(entryAction('intro','intro',false)).toBe('keep');expect(entryAction('observe-temperature','observe-vibration',false)).toBe('replay');});
 it('減少動態與靜態重入仍直接顯示全文',()=>{expect(entryAction('hero','intro',true)).toBe('settle');expect(entryAction('intro','intro',true)).toBe('keep');expect(entryAction('','intro',true)).toBe('settle');});
 it('靜態、降低動態與原協調器相容，沒有新增捲動監聽',()=>{const source=readFileSync('src/text-reveal.ts','utf8');expect(source).not.toContain('visited');expect(source).toContain("e.classList.remove('text-reveal-complete')");expect(source).toContain('node.cloneNode(true)');expect(source).toContain("visual.setAttribute('aria-hidden','true')");expect(source).not.toContain("addEventListener('scroll'");const css=readFileSync('src/text-reveal.css','utf8');expect(css).toContain('prefers-reduced-motion');expect(css).toContain('text-reveal-complete');const entry=readFileSync('src/intro-story.ts','utf8');expect(entry).toContain('textReveal.enter');expect(entry).toContain('staticMode||failureMode');});
});
