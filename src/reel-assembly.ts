import * as T from 'three';
import type {PumpModel} from './pump-detailed';
export const ASSEMBLY_SECONDS=7,ASSEMBLY_START=.6,ASSEMBLY_SPAN=5.25,PART_TRAVEL=.45,ASSEMBLY_COMPLETE=6.3;
export const ASSEMBLY_ORDER=['baseplate','shaft','bearing_front','bearing_rear','mechanical_seal','impeller','coupling','motor','volute','sensor_vibration','sensor_temperature'];
const clamp=(n:number)=>T.MathUtils.clamp(Number.isFinite(n)?n:0,0,1);
export function assemblyProgress(time:number,index:number,count:number){const start=ASSEMBLY_START+ASSEMBLY_SPAN*index/Math.max(1,count-1),p=clamp((time-start)/PART_TRAVEL);return p*p*p*(p*(p*6-15)+10);}
export type RackRect={left:number;right:number;top:number;bottom:number};
export type AssemblyElement={id:string;partId:string;mesh:T.Mesh;target:T.Vector3;rotation:T.Quaternion;targetScale:T.Vector3;origin:T.Vector3;material:T.Material[];lighting:Array<{material:T.MeshStandardMaterial;emissive:T.Color;waiting:T.Color;intensity:number}>;center:T.Vector3;radius:number;waitingScale:number;rack:RackRect;side:'left'|'right'};
export function createAssemblyController(model:PumpModel){
 const elements:AssemblyElement[]=[],owned:T.Material[]=[],travelLift=new T.Vector3();
 for(const partId of ASSEMBLY_ORDER){const part=model.parts.get(partId);if(!part)continue;part.traverse(obj=>{if(!(obj instanceof T.Mesh))return;const index=elements.length,id=`${partId}/${String(index).padStart(3,'0')}/${obj.name||obj.geometry.type}`;
  const materials=(Array.isArray(obj.material)?obj.material:[obj.material]).map(m=>{const clone=m.clone();clone.transparent=true;clone.depthWrite=true;owned.push(clone);return clone;});obj.material=materials.length===1?materials[0]:materials;
  obj.geometry.computeBoundingSphere();const sphere=obj.geometry.boundingSphere!,target=obj.position.clone(),rotation=obj.quaternion.clone();
  obj.name=id;obj.userData.assemblyId=id;elements.push({id,partId,mesh:obj,target,rotation,targetScale:obj.scale.clone(),origin:target.clone(),material:materials,lighting:materials.filter((m):m is T.MeshStandardMaterial=>m instanceof T.MeshStandardMaterial).map(material=>({material,emissive:material.emissive.clone(),waiting:material.emissive.clone().add(material.color.clone().multiplyScalar(.28)),intensity:material.emissiveIntensity})),center:sphere.center.clone(),radius:sphere.radius,waitingScale:.1,rack:{left:0,right:0,top:0,bottom:0},side:index%2?'right':'left'});
 });}
 // Conservative sphere projection accounts for off-axis perspective; no per-frame packing.
 function layout(camera:T.PerspectiveCamera,width:number,height:number){
  width=Math.max(1,width);height=Math.max(1,height);camera.updateMatrixWorld(true);travelLift.set(0,.1,0).applyQuaternion(camera.quaternion);
  const depth=camera.position.distanceTo(new T.Vector3(.2,1,0)),f=1/Math.tan(T.MathUtils.degToRad(camera.fov/2)),gapX=4/width,gapY=4/height,point=new T.Vector3(),offset=new T.Vector3();
  const sides=(['left','right'] as const).map(side=>elements.filter(e=>e.side===side).sort((a,b)=>b.radius-a.radius||a.id.localeCompare(b.id)));
  function pack(factor:number,commit:boolean){
   for(let si=0;si<2;si++){
    const left=si===0?-.96:.57,right=si===0?-.57:.96,rows:Array<{y:number;height:number;x:number}>=[];
    for(const e of sides[si]){
     const minScale=(4/height)*depth/(2*Math.max(.001,e.radius)*(f+.86)),scale=Math.min(.5,Math.max(factor,minScale)),r=e.radius*scale;
     const w=2*r*(f/camera.aspect+.96)/(depth-r),h=2*r*(f+.86)/(depth-r);
     let row=rows.find(row=>h<=row.height&&row.x+w<=right);
     if(!row){const y=rows.length?rows.at(-1)!.y-rows.at(-1)!.height-gapY:.86;if(y-h<-.86||left+w>right)return false;row={y,height:h,x:left};rows.push(row);}
     if(commit){e.waitingScale=scale;e.rack={left:row.x,right:row.x+w,top:row.y,bottom:row.y-h};const cx=(e.rack.left+e.rack.right)/2,cy=(e.rack.top+e.rack.bottom)/2;
      point.set(cx*depth*camera.aspect/f,cy*depth/f,-depth).applyMatrix4(camera.matrixWorld);offset.copy(e.center).multiply(e.targetScale).multiplyScalar(scale).applyQuaternion(e.rotation);e.origin.copy(point).sub(offset);}
     row.x+=w+gapX;
    }
   }return true;
  }
  let low=0,high=.5;if(!pack(0,false))throw new Error('Waiting racks exceed available desktop space');
  for(let i=0;i<24;i++){const middle=(low+high)/2;if(pack(middle,false))low=middle;else high=middle;}
  pack(low*.98,true);return{left:sides[0].length,right:sides[1].length,scale:low*.98};
 }
 function apply(time:number,reduced:boolean){let installed=0;const shellBlend=reduced?1:clamp((time-5.7)/.6);
  elements.forEach((e,i)=>{const p=reduced?1:assemblyProgress(time,i,elements.length);e.mesh.quaternion.copy(e.rotation);
   if(p===1){e.mesh.position.copy(e.target);e.mesh.scale.copy(e.targetScale);installed++;}else{e.mesh.position.lerpVectors(e.origin,e.target,p).addScaledVector(travelLift,Math.sin(Math.PI*p));e.mesh.scale.copy(e.targetScale).multiplyScalar(T.MathUtils.lerp(e.waitingScale,1,p));}
   const shell=e.partId==='volute'||(e.partId==='motor'&&!/定子|轉子|轉軸|風扇/.test(e.id)),opacity=shell&&p===1?.24+.76*shellBlend:1;e.mesh.visible=true;e.lighting.forEach(light=>{light.material.emissive.copy(light.waiting).lerp(light.emissive,p);light.material.emissiveIntensity=p===1?light.intensity:1;});e.material.forEach(m=>{m.opacity=opacity;m.depthWrite=opacity>.98;});
  });return{installed,total:elements.length,complete:installed===elements.length};
 }
 return{elements,layout,apply,dispose(){owned.forEach(m=>m.dispose());}};
}
