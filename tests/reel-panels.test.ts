import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {PANELS,panelAt} from '../src/reel-panels';
import {reelCameraScale} from '../src/reel-scene';
describe('八段左右對半圖文',()=>{
 it.each(PANELS.map((_,i)=>i))('段落 %i 具文字、右側圖示與說明',i=>{const html=panelAt(i);expect(html).toContain('class="panel-copy"');expect(html).toContain('class="panel-figure"');expect(html).toContain('<figcaption>');expect(html.indexOf('panel-copy')).toBeLessThan(html.indexOf('panel-figure'));expect(html).not.toMatch(/<button|https?:|iframe|script/);});
 it('每個非純模型圖示都有可讀名稱',()=>PANELS.slice(1).forEach(p=>expect(p.diagram).toMatch(/role="img" aria-label="[^"<>]+"/)));
 it('圖示保留安全與獨立作品界線',()=>{expect(panelAt(2)).toContain('不是故障確診');expect(panelAt(3)).toContain('不顯示虛構實測數字');expect(panelAt(4)).toContain('模型品質仍有已揭露限制');expect(panelAt(7)).toContain('不宣稱自動串接');expect(panelAt(7)).toContain('不控制設備');});
 it('非法索引拒絕而非展示其他段落',()=>{for(const i of [-1,8,NaN])expect(()=>panelAt(i)).toThrow(RangeError);});
 it('兩欄等寬，中文字與 SVG、播放控制皆採本機藝術字型',()=>{const css=readFileSync('src/reel.css','utf8');expect(css).toContain('grid-template-columns:minmax(0,1fr) minmax(0,1fr)');expect(css).toContain('.panel-diagram text{font-family:var(--art-font)}');expect(css).toContain("/assets/fonts/pump-wenkai-regular.woff");expect(css).not.toMatch(/fonts\.googleapis|@import/);expect(existsSync('public/assets/fonts/pump-wenkai-regular.woff')).toBe(true);expect(readFileSync('public/assets/fonts/OFL.txt','utf8')).toContain('SIL OPEN FONT LICENSE');});
 it('換片先搬出單一模型，再更換圖文，不重建 WebGL',()=>{const source=readFileSync('src/reel.ts','utf8');expect(source).toContain('layoutChanged=mountModel(screen)');expect(source).toContain("if(slot)mountModel(slot)");expect(source).toContain('modeKey!==f.mode||layoutChanged');});
 it('窄欄拉遠取景避免裁切，寬版原主角鏡頭不變',()=>{expect(reelCameraScale(2)).toBe(1);expect(reelCameraScale(.75)).toBeCloseTo(1.533333);});
 it('異常寬高比有界，避免鏡頭產生非法值',()=>{for(const value of [NaN,Infinity,0,-1])expect(reelCameraScale(value)).toBe(1);expect(reelCameraScale(.001)).toBeLessThan(6);});
});
