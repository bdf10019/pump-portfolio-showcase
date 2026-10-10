import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Mesh,MeshStandardMaterial} from 'three';
import {INTRO_VERSION,SLICES,TIMING,SLICE_VH,DWELL_END,BRIDGE_FRACTION,getSliceState,sliceProgress,curtainLift,narrativeFrame,progressAtAnchor,partFrame} from '../src/intro-contract';
import {CONTRAST,strongAppearance} from '../src/intro-appearance';
import {appearance} from '../src/scroll-presentation';
import {createPartPresentation} from '../src/scroll-parts';
import {createPumpModel,type PumpContract} from '../src/pump-detailed';
const html=readFileSync('intro-candidate.html','utf8');
describe('I1 起始布幕、節奏與八片契約',()=>{
 it('導覽以本機原創水泵圖標替換文字，保留返回入口與可存取名稱',()=>{const nav=html.split('<header')[1].split('</header>')[0];expect(nav).toContain('class="pump-brand" href="#intro"');expect(nav).toContain('aria-label="循環之內：返回三作品介紹"');expect(nav).toContain('src="/assets/pump-brand.svg"');expect(nav).not.toContain('>循環之內</a>');const svg=readFileSync('public/assets/pump-brand.svg','utf8');expect(svg).toContain('viewBox="0 0 96 64"');expect(svg).not.toMatch(/<script|<foreignObject|<image|href=|https?:\/\/(?!www\.w3\.org)/);});
 it('八片保留原七片的次序，00 是三作品介紹',()=>{expect(SLICES).toHaveLength(8);expect(SLICES[0].id).toBe('intro');expect(SLICES.slice(1).map(s=>s.id)).toEqual(['hero','loop-overview','loop-supply','loop-return','observe-vibration','observe-temperature','observe-safety']);});
 it('轉場加倍但不把閱讀停留及整片一起加倍',()=>{expect(TIMING.bridgeVh/TIMING.legacyBridgeVh).toBe(2);expect(TIMING.dwellVh).toBe(104);expect(SLICE_VH).toBe(156);expect(DWELL_END).toBeCloseTo(2/3);expect(BRIDGE_FRACTION*SLICE_VH).toBe(52);});
 it('布幕完整停留、連續整片上移，反向得到同一狀態',()=>{expect(curtainLift(sliceProgress(0,.5))).toBe(0);expect(curtainLift(sliceProgress(0,5/6))).toBeCloseTo(.5);expect(curtainLift(sliceProgress(1,0))).toBe(1);const p=[0,.3,.5,.7,.8,.9,1];expect(p.map(value=>curtainLift(value))).toEqual([...p].reverse().map(value=>curtainLift(value)).reverse());});
 it('降低動態不播放半移的布幕，跨片直接切換',()=>{expect(curtainLift(sliceProgress(0,.99),true)).toBe(0);expect(curtainLift(sliceProgress(1,0),true)).toBe(1);});
 it('主角在布幕後方保持同一穩定狀態，揭幕交界文案不消失',()=>{for(const local of [0,.5,.9,.999])expect(narrativeFrame(sliceProgress(0,local)).sceneProgress).toBe(.12);expect(narrativeFrame(sliceProgress(1,0)).sceneProgress).toBe(.12);expect(getSliceState(sliceProgress(1,0)).copyOpacity).toBe(1);});
 for(const [i,s] of SLICES.entries())it(`${s.id} 可定位、有限、正反一致`,()=>{for(const local of [.001,.5,.999]){const p=sliceProgress(i,local),frame=narrativeFrame(p);expect(getSliceState(p).slice.id).toBe(s.id);expect(frame.signal).toBe(s.signal);expect(frame.state.systemRoutePhase).toBe(s.route);expect([...frame.state.camera,frame.sceneProgress,frame.parts.explode].every(Number.isFinite)).toBe(true);expect(narrativeFrame(p)).toEqual(frame);}});
 it('非法輸入與不等高幾何有界',()=>{expect(getSliceState(NaN).slice.id).toBe('intro');expect(getSliceState(Infinity).slice.id).toBe('intro');expect(getSliceState(2).slice.id).toBe('observe-safety');const g=SLICES.map((s,i)=>({id:s.id,start:i*1500,end:(i+1)*1500}));expect(getSliceState(progressAtAnchor(g,9750)).slice.id).toBe('observe-temperature');expect(progressAtAnchor([],0)).toBe(0);});
 it('拆解進場使用 52svh，焦點交接與安全復原連續',()=>{expect(partFrame('vibration',0).explode).toBe(0);expect(partFrame('vibration',BRIDGE_FRACTION).explode).toBe(1);expect(partFrame('vibration',1).weights).toEqual(partFrame('temperature',0).weights);expect(partFrame('temperature',1).weights).toEqual(partFrame('safety',0).weights);expect(partFrame('safety',.8).explode).toBe(0);expect(partFrame('safety',.5).pulse).toBe(false);});
 it('00 文案包含三作品內容、例子與真實界線',()=>{const intro=html.split('id="intro"')[1].split('</section>')[0];for(const s of ['AI 模型服務與 MLOps','MCP 工具整合與授權治理','多模態文件理解與人工複核','測試回答品質','人工核准','對照來源','循環水泵','三個作品獨立運作','不控制真實設備'])expect(intro).toContain(s);});
 it('八片語意、一個畫布、只有降低動態按鈕，舊候選不改',()=>{expect(html).toContain(`data-version="${INTRO_VERSION}"`);expect(html.match(/<section [^>]*data-slice=/g)).toHaveLength(8);expect(html.match(/<canvas /g)).toHaveLength(1);expect(html.match(/<button /g)).toHaveLength(1);expect(html).toContain('class="no-js"');expect(html).not.toContain("classList.remove('no-js')");expect(readFileSync('scroll-candidate.html','utf8')).toContain('0.3.8-candidate');});
 it('專用建置不覆寫 dist 或 dist-scroll；協調器保留原生捲動',()=>{expect(readFileSync('vite.intro.config.ts','utf8')).toContain("outDir:'dist-intro'");const source=readFileSync('src/intro-story.ts','utf8');expect(source).toContain("window.addEventListener('scroll',schedule,{passive:true})");expect(source).not.toContain('scrollTo');expect(source).not.toContain('preventDefault');expect(source).toContain('partAppearance:strongAppearance');});
});
describe('I2 強對比隔離與復原',()=>{
 it('暗件 0.06、焦點 2.0、脈絡 0.2，與原策略不同',()=>{const frame=partFrame('vibration',.5);expect(strongAppearance(frame,'motor',0,false).brightness).toBeCloseTo(CONTRAST.dark);expect(strongAppearance(frame,'sensor_vibration',0,false).brightness).toBe(2);expect(strongAppearance(frame,'shaft',0,false).brightness).toBeCloseTo(.2);expect(appearance(frame,'motor',0).brightness).toBeCloseTo(.34);});
 it('換焦點後不同來源轉暗，安全與水路恢復正常且不呼吸',()=>{const t=partFrame('temperature',.5);expect(strongAppearance(t,'sensor_temperature',0,false).brightness).toBe(2);expect(strongAppearance(t,'sensor_vibration',0,false).brightness).toBeCloseTo(.06);for(const signal of [null,'safety'] as const){const look=strongAppearance(partFrame(signal,.8),'motor',0,false);expect(look).toEqual({brightness:1,emissive:0,matte:0});}});
 it('降低動態只有穩定亮暗，不隨時間改變',()=>{const frame=partFrame('vibration',.5,true);expect(strongAppearance(frame,'bearing_front',0,true)).toEqual(strongAppearance(frame,'bearing_front',100,true));expect(frame.pulse).toBe(false);});
 it('強對比原材質不變，還原粗糙度／反射並釋放 clone',()=>{
  const contract=JSON.parse(readFileSync('public/assets/pump-core-v1/pump-core-parts-v1.json','utf8')) as PumpContract;
  const pump=createPumpModel(contract,'mobile'),original=new Map<Mesh,MeshStandardMaterial>();pump.root.traverse(o=>{if(o instanceof Mesh)original.set(o,o.material as MeshStandardMaterial);});
  const saved=new Map([...original.values()].map(m=>[m,{color:m.color.toArray(),roughness:m.roughness,env:m.envMapIntensity}]));
  const p=createPartPresentation(pump,strongAppearance);p.update(partFrame('vibration',.5),0,false);
  for(const [m,s] of saved){expect(m.color.toArray()).toEqual(s.color);expect(m.roughness).toBe(s.roughness);}
  p.update(partFrame(null,0),0,false);for(const [mesh,m] of original){const clone=mesh.material as MeshStandardMaterial;expect(clone.color.toArray()).toEqual(saved.get(m)!.color);expect(clone.roughness).toBe(m.roughness);expect(clone.envMapIntensity).toBe(m.envMapIntensity);}
  let released=0;p.materials.forEach(m=>m.addEventListener('dispose',()=>released++));p.dispose();p.dispose();expect(released).toBe(p.materials.length);for(const [mesh,m] of original)expect(mesh.material).toBe(m);pump.dispose();
 });
});
