import {Color,Mesh,MeshStandardMaterial,Vector3,type Material} from 'three';
import {appearance,type PartFrame,type PartId} from './scroll-presentation';
import type {PumpModel} from './pump-detailed';

export type PartAppearance=(frame:PartFrame,id:PartId,time:number,reduced:boolean)=>{brightness:number;emissive:number;matte?:number};
export function createPartPresentation(pump:PumpModel,style:PartAppearance=appearance){
 const records:Array<{id:PartId;material:MeshStandardMaterial;color:Color;emissive:Color;intensity:number;environment:number;roughness:number}>=[];
 const bindings:Array<{mesh:Mesh;original:Material|Material[]}>=[];
 for(const [id,part] of pump.parts){
  const clones=new Map<MeshStandardMaterial,MeshStandardMaterial>();
  part.traverse(object=>{if(!(object instanceof Mesh))return;
   const original=object.material;bindings.push({mesh:object,original});
   const isolate=(material:Material)=>{
    if(!(material instanceof MeshStandardMaterial))return material;
    let clone=clones.get(material);if(!clone){clone=material.clone();clones.set(material,clone);records.push({id:id as PartId,material:clone,color:clone.color.clone(),emissive:clone.emissive.clone(),intensity:clone.emissiveIntensity,environment:clone.envMapIntensity,roughness:clone.roughness});}return clone;
   };
   object.material=Array.isArray(original)?original.map(isolate):isolate(original);
  });
 }
 let disposed=false;
 const amber=new Color(0xd99a45);
 function update(frame:PartFrame,time:number,reduced:boolean){
  if(disposed)return;pump.setExplode(frame.explode);
  // The inherited baseplate vector passes below the stage floor; keep its outline grounded.
  pump.parts.get('baseplate')!.position.y=frame.explode===0?0:-.02*frame.explode;
  for(const record of records){const look=style(frame,record.id,time,reduced);
   record.material.color.copy(record.color).multiplyScalar(look.brightness);
   record.material.envMapIntensity=record.environment*look.brightness;
   record.material.roughness=record.roughness+(.94-record.roughness)*(look.matte??0);
   record.material.emissive.copy(record.emissive).lerp(amber,look.emissive);
   record.material.emissiveIntensity=look.emissive>0?1.2:record.intensity;
  }
 }
 function dispose(){if(disposed)return;disposed=true;for(const binding of bindings)binding.mesh.material=binding.original;records.forEach(r=>r.material.dispose());}
 function anchor(id:PartId){const part=pump.parts.get(id)!;
  const points:Partial<Record<PartId,[number,number,number]>>={sensor_vibration:[-.2,1.62,.03],sensor_temperature:[.16,1.62,-.04],bearing_front:[-.21,1.08,0],bearing_rear:[.17,1.08,0],mechanical_seal:[-.6,1.08,0],motor:[1.58,1.08,0]};
  return part.localToWorld(new Vector3(...(points[id]??[0,1.08,0])));
 }
 return{update,dispose,anchor,materials:records.map(r=>r.material),snapshot:()=>Object.fromEntries([...pump.parts].map(([id,part])=>[id,{position:part.position.toArray(),materials:(part.children.filter(c=>c instanceof Mesh) as Mesh[]).map(c=>{const m=c.material as MeshStandardMaterial;return{color:m.color.toArray(),emissive:m.emissive.toArray()};})}]))};
}
