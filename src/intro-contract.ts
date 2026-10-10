import {clamp01,getStoryState,type SceneId,type SignalId,type SystemRoutePhase} from './story-contract';
import {PART_IDS,smooth,type PartFrame,type PartId} from './scroll-presentation';

export const INTRO_VERSION='0.4.0';
export const TIMING={legacyBridgeVh:26,dwellVh:104,bridgeVh:52} as const;
export const SLICE_VH=TIMING.dwellVh+TIMING.bridgeVh;
export const DWELL_END=TIMING.dwellVh/SLICE_VH;
export const BRIDGE_FRACTION=TIMING.bridgeVh/SLICE_VH;
export const SLICES=[
 {id:'intro',chapter:'opening',label:'00',title:'三個作品，先說清楚。',route:'overview',signal:null},
 {id:'hero',chapter:'opening',label:'01',title:'同一台水泵，三種工作。',route:'overview',signal:null},
 {id:'loop-overview',chapter:'system',label:'02-1',title:'水泵，讓水持續循環。',route:'overview',signal:null},
 {id:'loop-supply',chapter:'system',label:'02-2',title:'把水送出去，帶走熱量。',route:'supply',signal:null},
 {id:'loop-return',chapter:'system',label:'02-3',title:'用過的水，回到水泵。',route:'return',signal:null},
 {id:'observe-vibration',chapter:'signals',label:'03-1',title:'震動持續，先找資料來源。',route:'return',signal:'vibration'},
 {id:'observe-temperature',chapter:'signals',label:'03-2',title:'溫度偏高，再看運轉條件。',route:'return',signal:'temperature'},
 {id:'observe-safety',chapter:'signals',label:'03-3',title:'未發現危害，仍需確認狀態。',route:'return',signal:'safety'},
] as const satisfies ReadonlyArray<{id:string;chapter:SceneId;label:string;title:string;route:SystemRoutePhase;signal:SignalId|null}>;
export type SliceId=typeof SLICES[number]['id'];
export type SliceGeometry={id:SliceId;start:number;end:number};
export const bridgeProgress=(local:number)=>smooth(DWELL_END,1,local);
export function sliceProgress(index:number,local:number){
 const i=Number.isFinite(index)?Math.min(Math.max(Math.trunc(index),0),SLICES.length-1):0;
 return(i+clamp01(local))/SLICES.length;
}
export function getSliceState(progress:number){
 const p=clamp01(progress)*SLICES.length,index=Math.min(Math.floor(p),SLICES.length-1),local=p-index,slice=SLICES[index];
 const exit=index===SLICES.length-1?1:1-smooth(DWELL_END+.16,1,local);
 const copyOpacity=index===0?1:index===1?exit:smooth(0,.1,local)*exit;
 return{slice,index,local,copyOpacity};
}
export function curtainLift(progress:number,reduced=false){
 const {index,local}=getSliceState(progress);
 return index>0?1:reduced?0:bridgeProgress(local);
}
export function progressAtAnchor(geometries:ReadonlyArray<SliceGeometry>,anchor:number){
 if(!geometries.length||!Number.isFinite(anchor))return 0;
 let index=0;for(let i=0;i<geometries.length;i++){if(anchor<geometries[i].start)break;index=i;}
 const g=geometries[index];return sliceProgress(index,clamp01((anchor-g.start)/Math.max(1,g.end-g.start)));
}
export function partFrame(signal:SignalId|null,local:number,reduced=false):PartFrame{
 const t=clamp01(local),weights=Object.fromEntries(PART_IDS.map(id=>[id,0])) as Record<PartId,number>;
 let explode=0,dim=0;const labels:PartId[]=[];
 if(signal==='vibration'||signal==='temperature'){
  explode=signal==='vibration'?(reduced?1:smooth(0,BRIDGE_FRACTION,t)):1;
  const blend=reduced?0:bridgeProgress(t);
  dim=explode*(signal==='temperature'?1-blend:1);
  weights.bearing_front=weights.bearing_rear=dim;
  weights.shaft=dim*.48;weights.coupling=signal==='vibration'?dim*(.48*(1-blend)+.2*blend):dim*.2;
  weights.sensor_vibration=signal==='vibration'?explode*(1-blend):0;
  weights.sensor_temperature=signal==='temperature'?dim:explode*blend;
  labels.push(signal==='vibration'?'sensor_vibration':'sensor_temperature','bearing_front','bearing_rear');
 }else if(signal==='safety'){
  explode=reduced?0:1-smooth(0,.7,t);labels.push('mechanical_seal','motor');
 }
 return{explode,dim,weights,pulse:!reduced&&dim>0,labels};
}
export function narrativeFrame(progress:number,reduced=false){
 const {slice,local}=getSliceState(progress);let sceneProgress:number;
 if(slice.id==='intro')sceneProgress=.12;
 else if(slice.id==='hero')sceneProgress=reduced?.12:.12+.38*bridgeProgress(local);
 else if(slice.id==='loop-overview')sceneProgress=.5;
 else if(slice.id==='loop-supply')sceneProgress=.56;
 else if(slice.id==='loop-return')sceneProgress=reduced?.62:.62+.32*bridgeProgress(local);
 else sceneProgress=.94;
 const state=getStoryState(sceneProgress);
 return{sceneProgress,signal:slice.signal,parts:partFrame(slice.signal,local,reduced),state:{...state,scene:slice.chapter,systemRoutePhase:slice.route,localProgress:local,signalOpacity:slice.chapter==='signals'?1:0}};
}
