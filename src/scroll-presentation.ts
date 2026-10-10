import {clamp01,type SignalId} from './story-contract';
export const PART_IDS=['volute','impeller','shaft','bearing_front','bearing_rear','mechanical_seal','coupling','motor','baseplate','sensor_vibration','sensor_temperature'] as const;
export type PartId=typeof PART_IDS[number];
export type PartFrame={explode:number;dim:number;weights:Record<PartId,number>;pulse:boolean;labels:PartId[]};
export const smooth=(a:number,b:number,value:number)=>{const t=clamp01((value-a)/(b-a));return t*t*(3-2*t);};
export function partFrame(signal:SignalId|null,local:number,reduced=false):PartFrame{
 const t=clamp01(local),weights=Object.fromEntries(PART_IDS.map(id=>[id,0])) as Record<PartId,number>;
 let explode=0,dim=0;const labels:PartId[]=[];
 if(signal==='vibration'||signal==='temperature'){
  explode=signal==='vibration'?(reduced?1:smooth(.05,.25,t)):1;
  const blend=reduced?0:smooth(.8,1,t);
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
// Linear material multiplier, not a claim of measured perceived luminance.
export function appearance(frame:PartFrame,id:PartId,time:number,reduced=false){
 const weight=clamp01(frame.weights[id]),breath=frame.pulse&&!reduced?.9+.1*Math.sin((Number.isFinite(time)?time:0)*Math.PI*2/2.8):1;
 const base=1-.66*clamp01(frame.dim);
 return{brightness:base+(1-base)*weight,emissive:weight*.24*breath};
}
