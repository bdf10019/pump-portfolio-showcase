import {readFileSync} from 'node:fs';
import {describe,it,expect,afterAll} from 'vitest';
import {Mesh,MeshStandardMaterial} from 'three';
import {createPumpModel,type PumpContract} from '../src/pump-detailed';
import {createPartPresentation} from '../src/scroll-parts';
import {appearance,partFrame,PART_IDS} from '../src/scroll-presentation';
import {narrativeFrame,sliceProgress} from '../src/scroll-contract';
const contract=JSON.parse(readFileSync('public/assets/pump-core-v1/pump-core-parts-v1.json','utf8')) as PumpContract;
describe('可逆拆解與亮暗契約',()=>{
 it('11 節點完全對應現有契約',()=>expect(PART_IDS).toEqual(contract.parts.map(p=>p.id)));
 it('水路不拆解，震動進場才展開',()=>{
  for(let i=0;i<4;i++)for(const local of [0,.5,.999])expect(narrativeFrame(sliceProgress(i,local)).parts.explode).toBe(0);
  expect(partFrame('vibration',0).explode).toBe(0);expect(partFrame('vibration',.3).explode).toBe(1);
 });
 it('溫度不重拆、安全逐步收攏',()=>{expect(partFrame('temperature',0).explode).toBe(1);expect(partFrame('temperature',1).explode).toBe(1);expect(partFrame('safety',0).explode).toBe(1);expect(partFrame('safety',.35).explode).toBeCloseTo(.5);expect(partFrame('safety',.7).explode).toBe(0);});
 it('穩定區只突出對應來源及軸承，脈絡較弱',()=>{
  const v=partFrame('vibration',.5),t=partFrame('temperature',.5);expect(v.weights.sensor_vibration).toBe(1);expect(v.weights.sensor_temperature).toBe(0);expect(t.weights.sensor_temperature).toBe(1);expect(t.weights.sensor_vibration).toBe(0);
  for(const f of [v,t]){expect(f.weights.bearing_front).toBe(1);expect(f.weights.bearing_rear).toBe(1);expect(f.weights.shaft).toBeLessThan(1);expect(f.weights.motor).toBe(0);}
 });
 it('跨片連續，安全片不設故障高亮',()=>{expect(partFrame('vibration',1).weights).toEqual(partFrame('temperature',0).weights);expect(partFrame('temperature',1).weights).toEqual(partFrame('safety',0).weights);expect(partFrame('temperature',1).dim).toBe(partFrame('safety',0).dim);for(const local of [0,.5,1]){const f=partFrame('safety',local);expect(f.pulse).toBe(false);expect(Object.values(f.weights).every(w=>w===0)).toBe(true);}});
 it('降低動態保留固定拆解與亮暗，安全完整組裝',()=>{for(const s of ['vibration','temperature'] as const){const f=partFrame(s,.5,true);expect(f.explode).toBe(1);expect(f.pulse).toBe(false);expect(appearance(f,'bearing_front',0,true)).toEqual(appearance(f,'bearing_front',100,true));}expect(partFrame('safety',.5,true).explode).toBe(0);});
 it('正反一致、非法輸入有限、標籤最多三個',()=>{const positions=Array.from({length:701},(_,i)=>i/700);expect([...positions].reverse().map(p=>narrativeFrame(p)).reverse()).toEqual(positions.map(p=>narrativeFrame(p)));for(const p of [NaN,-1,Infinity,2,...positions]){const f=narrativeFrame(p).parts;expect(Number.isFinite(f.explode)).toBe(true);expect(Object.values(f.weights).every(w=>w>=0&&w<=1)).toBe(true);expect(f.labels.length).toBeLessThanOrEqual(3);}});
 it('低暗仍保留輪廓，呼吸只改柔和發光',()=>{const f=partFrame('vibration',.5);expect(appearance(f,'motor',0).brightness).toBeCloseTo(.34);expect(appearance(f,'bearing_front',0).brightness).toBe(1);const values=Array.from({length:100},(_,i)=>appearance(f,'bearing_front',i*.028).emissive);expect(Math.max(...values)).toBeLessThanOrEqual(.24);expect(Math.min(...values)).toBeGreaterThanOrEqual(.192);});
});
describe('材質隔離與釋放',()=>{
 const pump=createPumpModel(contract,'mobile'),original=new Map<Mesh,MeshStandardMaterial>();pump.root.traverse(o=>{if(o instanceof Mesh)original.set(o,o.material as MeshStandardMaterial);});
 const colors=new Map([...original.values()].map(m=>[m,m.color.toArray()])),presentation=createPartPresentation(pump);
 afterAll(()=>{presentation.dispose();pump.dispose();});
 it('跨零件不共用 clone，原材質不改色',()=>{const owners=new Map<MeshStandardMaterial,string>();for(const [id,part] of pump.parts)part.traverse(o=>{if(o instanceof Mesh){const m=o.material as MeshStandardMaterial;expect(m).not.toBe(original.get(o));expect(owners.has(m)?owners.get(m):id).toBe(id);owners.set(m,id);}});presentation.update(partFrame('vibration',.5),0,false);for(const [m,c] of colors)expect(m.color.toArray()).toEqual(c);});
 it('換組後返回水路，位置及材質無殘留',()=>{presentation.update(partFrame('temperature',.5),0,false);expect(pump.parts.get('sensor_temperature')!.position.y).toBe(.85);presentation.update(partFrame(null,0),0,false);for(const p of pump.parts.values())expect(p.position.toArray()).toEqual([0,0,0]);for(const [mesh,m] of original){expect((mesh.material as MeshStandardMaterial).color.toArray()).toEqual(m.color.toArray());expect((mesh.material as MeshStandardMaterial).emissive.toArray()).toEqual(m.emissive.toArray());}});
 it('底座不沉入地板、重複釋放僅一次且還原原材質',()=>{presentation.update(partFrame('vibration',.5),0,false);expect(pump.parts.get('baseplate')!.position.y).toBe(-.02);let released=0;presentation.materials.forEach(m=>m.addEventListener('dispose',()=>released++));presentation.dispose();presentation.dispose();expect(released).toBe(presentation.materials.length);for(const [mesh,m] of original)expect(mesh.material).toBe(m);});
});
