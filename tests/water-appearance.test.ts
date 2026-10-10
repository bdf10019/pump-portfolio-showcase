import {describe,it,expect} from 'vitest';
import {Mesh,MeshStandardMaterial} from 'three';
import {createLayoutModel} from '../src/water-layout-model';
import {createSurfaceTexture,fadeMaterial,pipeOpacity} from '../src/water-appearance';

describe('W3 材質與外延淡化',()=>{
 it('三個透明度節點連續且左右對稱，中央完全不透明',()=>{
  expect(pipeOpacity(0)).toBe(1);expect(pipeOpacity(12.5)).toBe(1);
  expect(pipeOpacity(15)).toBeCloseTo(.55);expect(pipeOpacity(19)).toBeCloseTo(.15);expect(pipeOpacity(22)).toBe(0);
  let last=1;for(let x=0;x<24;x+=.01){const a=pipeOpacity(x);expect(a).toBeLessThanOrEqual(last+1e-12);expect(a).toBeCloseTo(pipeOpacity(-x));last=a;}
 });
 it('生成的微表面貼圖可重現且不依賴外部圖片',()=>{
  const a=createSurfaceTexture(),b=createSurfaceTexture();
  expect(a.image.width).toBe(128);expect(a.image.data).toEqual(b.image.data);a.dispose();b.dispose();
 });
 it('PBR 保持材質分工；外延不投影，中央不使用透明混合',()=>{
  const model=createLayoutModel(true,true),materials:MeshStandardMaterial[]=[];
  try{
   expect(model.group.children.length).toBeLessThanOrEqual(9);
   model.group.traverse(o=>{if(o instanceof Mesh){const m=o.material as MeshStandardMaterial;materials.push(m);expect(o.receiveShadow).toBe(true);expect(o.castShadow).toBe(!m.transparent);}});
   expect(materials.filter(m=>m.transparent)).toHaveLength(2);
   expect(materials.find(m=>m.name==='黑色橡膠')?.metalness).toBe(0);
   expect(materials.find(m=>m.name==='不鏽鋼與鍍鋅件')?.metalness).toBeGreaterThan(.8);
   expect(materials.find(m=>m.name==='灰紅烤漆膨脹桶')?.transparent).toBe(false);
  }finally{model.dispose();}
 });
 it('淡化關閉修改既有 uniform，無須重新編譯材質',()=>{
  const base=new MeshStandardMaterial(),fade=fadeMaterial(base);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
  fade.material.onBeforeCompile(shader as Parameters<typeof fade.material.onBeforeCompile>[0],null as unknown as Parameters<typeof fade.material.onBeforeCompile>[1]);
  const uniforms=shader.uniforms as {uWaterFade:{value:number}};
  expect(uniforms.uWaterFade.value).toBe(1);fade.setEnabled(false);expect(uniforms.uWaterFade.value).toBe(0);fade.setEnabled(true);expect(uniforms.uWaterFade.value).toBe(1);
  expect(shader.fragmentShader).toContain('diffuseColor.a *=');fade.material.dispose();base.dispose();
 });
});
