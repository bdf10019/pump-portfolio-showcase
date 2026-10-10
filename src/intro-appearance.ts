import {clamp01} from './story-contract';
import type {PartFrame,PartId} from './scroll-presentation';
import type {PartAppearance} from './scroll-parts';

// Linear material settings, not measured screen luminance or diagnostic confidence.
export const CONTRAST={dark:.06,context:.2,focus:2,emissive:.36} as const;
export const strongAppearance:PartAppearance=(frame:PartFrame,id:PartId,time:number,reduced=false)=>{
 const dim=clamp01(frame.dim),weight=clamp01(frame.weights[id]);
 const passive=1-(1-CONTRAST.dark)*dim,context=id==='shaft'||id==='coupling';
 const strength=context?clamp01(weight/.48):weight;
 const brightness=passive+((context?CONTRAST.context:CONTRAST.focus)-passive)*strength;
 const breath=frame.pulse&&!reduced?.9+.1*Math.sin((Number.isFinite(time)?time:0)*Math.PI*2/2.8):1;
 return{brightness,emissive:context?0:weight*CONTRAST.emissive*breath,matte:dim*(1-strength)};
};
