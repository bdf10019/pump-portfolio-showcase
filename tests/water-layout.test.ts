import {describe,it,expect} from 'vitest';
import {inspectEnvelope,makeCamera,margins,createLayoutModel} from '../src/water-layout-model';
import {Mesh} from 'three';
describe('W1 管口旋轉包絡',()=>{
 for(const [width,height] of [[1280,494],[1440,674],[1920,854]])it(`${width} 桌機所有 561 組角度保留管口外延`,()=>{
  const report=inspectEnvelope(width,height);expect(report.samples).toBe(561);expect(report.neutralMargin).toBeGreaterThanOrEqual(.18);expect(report.minimumMargin).toBeGreaterThanOrEqual(.06);expect(report.continuousMinimum).toBeGreaterThanOrEqual(.06);expect(report.continuousMinimum).toBeLessThanOrEqual(report.minimumMargin);expect(report.passed).toBe(true);
 });
 it('左右方向均以整個管口截面計算，包含極限旋轉',()=>{
  const camera=makeCamera(1440,674);for(const yaw of [-8,8])for(const pitch of [-4,4]){const all=margins(camera,yaw,pitch);expect(all).toHaveLength(4);for(const p of all)expect(p.margin).toBeGreaterThan(.06);}
 });
 it('灰模與細節版均合併為三個材質繪製，細節幾何不超出預算',()=>{
  let grayTriangles=0;
  for(const detail of [false,true]){
   const model=createLayoutModel(detail);let triangles=0;
   try{
    expect(model.group.children).toHaveLength(3);
    model.group.traverse(o=>{if(o instanceof Mesh){triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;for(const n of o.geometry.getAttribute('position').array)expect(Number.isFinite(n)).toBe(true);}});
    expect(triangles).toBeLessThan(100000);
    if(detail)expect(triangles).toBeGreaterThan(grayTriangles);else grayTriangles=triangles;
   }finally{model.dispose();}
  }
 });
});
