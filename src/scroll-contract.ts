import {clamp01,getStoryState,type SceneId,type SignalId,type SystemRoutePhase} from './story-contract';
import {partFrame} from './scroll-presentation';

export const CANDIDATE_VERSION='0.3.8-candidate';
export const SLICES=[
 {id:'hero',chapter:'opening',label:'01',title:'一台水泵，貫穿整個流程。',route:'overview',signal:null},
 {id:'loop-overview',chapter:'system',label:'02-1',title:'先看完整水路。',route:'overview',signal:null},
 {id:'loop-supply',chapter:'system',label:'02-2',title:'沿著供水，往負載走。',route:'supply',signal:null},
 {id:'loop-return',chapter:'system',label:'02-3',title:'沿著回水，回到主角。',route:'return',signal:null},
 {id:'observe-vibration',chapter:'signals',label:'03-1',title:'持續震動',route:'return',signal:'vibration'},
 {id:'observe-temperature',chapter:'signals',label:'03-2',title:'軸承溫度偏高',route:'return',signal:'temperature'},
 {id:'observe-safety',chapter:'signals',label:'03-3',title:'未發現危害跡象',route:'return',signal:'safety'},
] as const satisfies ReadonlyArray<{id:string;chapter:SceneId;label:string;title:string;route:SystemRoutePhase;signal:SignalId|null}>;
export type SliceId=typeof SLICES[number]['id'];
export type SliceGeometry={id:SliceId;start:number;end:number};

const smooth=(start:number,end:number,value:number)=>{const p=clamp01((value-start)/(end-start));return p*p*(3-2*p);};
export function sliceProgress(index:number,local:number){
 const boundedIndex=Number.isFinite(index)?Math.min(Math.max(Math.trunc(index),0),SLICES.length-1):0;
 return(boundedIndex+clamp01(local))/SLICES.length;
}
export function getSliceState(progress:number){
 const position=clamp01(progress)*SLICES.length,index=Math.min(Math.floor(position),SLICES.length-1);
 const local=position-index,slice=SLICES[index];
 const copyOpacity=index===0?1-smooth(.8,1,local):smooth(0,.15,local)*(index===SLICES.length-1?1:1-smooth(.85,1,local));
 return{slice,index,local,copyOpacity};
}
export function progressAtAnchor(geometries:ReadonlyArray<SliceGeometry>,anchor:number){
 if(!geometries.length||!Number.isFinite(anchor))return 0;
 let index=0;for(let i=0;i<geometries.length;i++){if(anchor<geometries[i].start)break;index=i;}
 const item=geometries[index],local=clamp01((anchor-item.start)/Math.max(item.end-item.start,1));
 return sliceProgress(index,local);
}
export function narrativeFrame(progress:number,reduced=false){
 const {slice,local}=getSliceState(progress);
 let sceneProgress:number;
 if(slice.id==='hero')sceneProgress=reduced?.12:.12+.38*smooth(.8,1,local);
 else if(slice.id==='loop-overview')sceneProgress=.5;
 else if(slice.id==='loop-supply')sceneProgress=.56;
 else if(slice.id==='loop-return')sceneProgress=reduced?.62:.62+.32*smooth(.8,1,local);
 else sceneProgress=.94;
 const state=getStoryState(sceneProgress);
 return{sceneProgress,signal:slice.signal,parts:partFrame(slice.signal,local,reduced),state:{...state,scene:slice.chapter,systemRoutePhase:slice.route,localProgress:local,signalOpacity:slice.chapter==='signals'?1:0}};
}
