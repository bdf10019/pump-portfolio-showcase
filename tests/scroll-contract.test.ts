import {describe,it,expect} from 'vitest';
import {SLICES,getSliceState,sliceProgress,progressAtAnchor,narrativeFrame} from '../src/scroll-contract';
import {waterStoryWeight} from '../src/water-story';

describe('F1 七片純捲動契約',()=>{
 it('七切片仍屬三章，訊號按捲動先後得到',()=>{
  expect(SLICES).toHaveLength(7);expect(new Set(SLICES.map(s=>s.chapter)).size).toBe(3);
  expect(SLICES.slice(4).map(s=>s.signal)).toEqual(['vibration','temperature','safety']);
 });
 for(const [i,slice] of SLICES.entries())it(`${slice.id} 首／中／尾可直接定位並保留路線`,()=>{
  for(const local of [.001,.5,.999]){const p=sliceProgress(i,local),result=getSliceState(p),frame=narrativeFrame(p);expect(result.slice.id).toBe(slice.id);expect(result.local).toBeCloseTo(local);expect(frame.state.systemRoutePhase).toBe(slice.route);expect(frame.signal).toBe(slice.signal);}
 });
 it('夾限非法輸入，最後一片的終點不溢位',()=>{
  expect(getSliceState(NaN).slice.id).toBe('hero');expect(getSliceState(-2).slice.id).toBe('hero');expect(getSliceState(2).slice.id).toBe('observe-safety');expect(getSliceState(1).local).toBe(1);
  expect(sliceProgress(NaN,0)).toBe(0);expect(sliceProgress(-1,0)).toBe(0);expect(sliceProgress(99,1)).toBe(1);
 });
 it('邊界前後只切換相鄰片，正反查詢得到相同結果',()=>{
  for(let i=1;i<7;i++){expect(getSliceState(i/7-1e-8).index).toBe(i-1);expect(getSliceState(i/7+1e-8).index).toBe(i);}
  const values=Array.from({length:141},(_,i)=>i/140);expect(values.map(p=>narrativeFrame(p))).toEqual([...values].reverse().map(p=>narrativeFrame(p)).reverse());
 });
 it('每片降低動態仍保留各自路線與訊號，不合併第三幕',()=>{
  for(let i=0;i<7;i++){const frame=narrativeFrame(sliceProgress(i,.9),true);expect(frame.signal).toBe(SLICES[i].signal);expect(frame.state.systemRoutePhase).toBe(SLICES[i].route);expect(Number.isFinite(frame.sceneProgress)).toBe(true);}
 });
 it('水路完成退出後才進入第三幕，水路三片穩定區仍完整',()=>{
  for(let i=1;i<=3;i++)expect(waterStoryWeight(narrativeFrame(sliceProgress(i,.5)).sceneProgress)).toBe(1);
  for(let i=4;i<7;i++)expect(waterStoryWeight(narrativeFrame(sliceProgress(i,.5)).sceneProgress)).toBe(0);
 });
 it('捲動幾何支援非等高切片、快速跨越與直接進入',()=>{
  let start=0;const geometries=SLICES.map((s,i)=>{const item={id:s.id,start,end:start+900+i*100};start=item.end;return item;});
  expect(getSliceState(progressAtAnchor(geometries,(geometries[5].start+geometries[5].end)/2)).slice.id).toBe('observe-temperature');
  expect(progressAtAnchor(geometries,-100)).toBe(0);expect(progressAtAnchor(geometries,999999)).toBe(1);expect(progressAtAnchor([],100)).toBe(0);
 });
 it('所有狀態數值有限，取同一進度不會自行推進',()=>{
  for(let i=0;i<=100;i++){const p=i/100,frame=narrativeFrame(p);expect([...frame.state.camera,...frame.state.target,frame.sceneProgress].every(Number.isFinite)).toBe(true);expect(narrativeFrame(p)).toEqual(frame);}
 });
});
