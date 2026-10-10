import * as T from 'three';
import {PIPE_RADIUS} from './water-layout-model';
import {FLOW_ROUTES,flowCurve} from './water-flow-routes';
import type {SystemRoutePhase} from './story-contract';
export const CHEVRON={size:PIPE_RADIUS*4,spacing:PIPE_RADIUS*4*1.5,speed:.72,samples:512} as const;
export function arrowPhase(index:number,count:number,time:number,length:number,reduced:boolean){
 const offset=reduced?0:(Number.isFinite(time)?time:0)*CHEVRON.speed/Math.max(length,.001);
 return((index/Math.max(count,1)+offset)%1+1)%1;
}
export function createWaterChevrons(){
 const root=new T.Group();root.name='water_flow_chevrons';
 const h=CHEVRON.size/2,shape=new T.Shape();
 shape.moveTo(-h,h);shape.lineTo(h,0);shape.lineTo(-h,-h);shape.lineTo(-h,-h*.5);shape.lineTo(0,0);shape.lineTo(-h,h*.5);shape.closePath();
 const geometry=new T.ShapeGeometry(shape);geometry.computeBoundingBox();
 const flows=FLOW_ROUTES.map(({phase,points})=>{
  const curve=flowCurve(points),length=curve.getLength(),count=Math.max(2,Math.ceil(length/CHEVRON.spacing));
  const samples=new Float32Array((CHEVRON.samples+1)*3),v=new T.Vector3();
  for(let i=0;i<=CHEVRON.samples;i++){curve.getPoint(i/CHEVRON.samples,v);samples[i*3]=v.x;samples[i*3+1]=v.y;samples[i*3+2]=v.z;}
  const material=new T.MeshBasicMaterial({color:phase==='supply'?0x63d3dc:0x71b8d4,side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const mesh=new T.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;
  mesh.name=`${phase}_chevrons`;mesh.userData.routeGuide=true;mesh.userData.phase=phase;mesh.userData.arrowSize=CHEVRON.size;root.add(mesh);
  return{phase,length,samples,mesh};
 });
 const point=new T.Vector3(),before=new T.Vector3(),after=new T.Vector3(),tangent=new T.Vector3(),across=new T.Vector3(),normal=new T.Vector3(0,1,0),basis=new T.Matrix4(),pose=new T.Object3D();
 let disposed=false;
 function sample(buffer:Float32Array,t:number,target:T.Vector3){
  const x=T.MathUtils.clamp(t,0,1)*CHEVRON.samples,index=Math.min(Math.floor(x),CHEVRON.samples-1),mix=x-index,a=index*3,b=a+3;
  target.set(T.MathUtils.lerp(buffer[a],buffer[b],mix),T.MathUtils.lerp(buffer[a+1],buffer[b+1],mix),T.MathUtils.lerp(buffer[a+2],buffer[b+2],mix));
 }
 return{
  root,
  update(weight:number,phase:SystemRoutePhase,time:number,reduced:boolean){
   if(disposed)return;root.visible=weight>.002;if(!root.visible)return;
   for(const flow of flows){
    const active=phase==='overview'||phase===flow.phase;flow.mesh.material.opacity=weight*(active?.94:.12);
    for(let i=0;i<flow.mesh.count;i++){
     const t=arrowPhase(i,flow.mesh.count,time,flow.length,reduced);
     sample(flow.samples,t,point);sample(flow.samples,Math.max(0,t-.002),before);sample(flow.samples,Math.min(1,t+.002),after);
     tangent.subVectors(after,before);tangent.y=0;
     if(tangent.lengthSq()<1e-8)tangent.set(0,0,-1);else tangent.normalize();
     across.crossVectors(normal,tangent).normalize();basis.makeBasis(tangent,across,normal);
     pose.position.copy(point);pose.position.y+=flow.phase==='return'?1.2:.72;pose.quaternion.setFromRotationMatrix(basis);pose.updateMatrix();
     flow.mesh.setMatrixAt(i,pose.matrix);
    }
    flow.mesh.instanceMatrix.needsUpdate=true;
   }
  },
  dispose(){if(disposed)return;disposed=true;for(const flow of flows){flow.mesh.dispose();flow.mesh.material.dispose();}geometry.dispose();root.clear();},
 };
}
