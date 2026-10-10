import {describe,it,expect} from 'vitest';
import {Mesh,Points} from 'three';
import {createStoryWater,desktopWaterCamera,waterStoryWeight} from '../src/water-story';
import {margins} from '../src/water-layout-model';
import {getSystemRoute} from '../src/story-contract';

describe('W4 桌機水路整合',()=>{
 for(const [width,height] of [[1280,720],[1440,900],[1920,1080]])it(`${width} 新透視鏡頭的旋轉範圍仍不露管口`,()=>{
  const camera=desktopWaterCamera(width,height);let minimum=Infinity;
  for(let yaw=-8;yaw<=8;yaw+=.5)for(let pitch=-4;pitch<=4;pitch+=.5)for(const p of margins(camera,yaw,pitch))minimum=Math.min(minimum,p.margin);
  expect(minimum).toBeGreaterThan(.06);
 });
 it('反向重建時水路進退狀態相同，開場與訊號結尾完全退出',()=>{
  const progress=[0,.2,.34,.48,.6,.68,.72,.86,1];
  expect(progress.map(waterStoryWeight)).toEqual([...progress].reverse().map(waterStoryWeight).reverse());
  expect(waterStoryWeight(0)).toBe(0);expect(waterStoryWeight(.6)).toBe(1);expect(waterStoryWeight(1)).toBe(0);
 });
 it('供回水篩選只改方向線，降低動態仍保留靜止方向點',()=>{
  const water=createStoryWater();
  try{
   const lines=water.root.children.filter(o=>o.userData.routeGuide) as Mesh[];
   const dots=water.root.children.filter(o=>o instanceof Points) as Points[];
   water.update(1,'supply',15,true);
   expect(lines[0].material).toHaveProperty('opacity',.09);expect(lines[1].material).toHaveProperty('opacity',.78);
   expect(dots[0].material).toHaveProperty('opacity',0);expect(dots[1].material).toHaveProperty('opacity',.9);
   const frozen=Array.from(dots[1].geometry.getAttribute('position').array);
   water.update(1,'supply',30,true);expect(Array.from(dots[1].geometry.getAttribute('position').array)).toEqual(frozen);
   water.update(1,'return',30,false);expect(dots[0].material).toHaveProperty('opacity',.9);expect(dots[1].material).toHaveProperty('opacity',0);
   water.update(0,'overview',0,true);expect(water.root.visible).toBe(false);
  }finally{water.dispose();}
 });
 it('新水路說明保留膨脹桶支管與獨立冷源，也保留舊版文案',()=>{
  expect(getSystemRoute('overview',true).description).toContain('支管');
  expect(getSystemRoute('supply',true).description).toContain('不與製程水混合');
  expect(getSystemRoute('return',true).description).toContain('畫面外');
  expect(getSystemRoute('overview').description).toContain('水箱');
 });
});
