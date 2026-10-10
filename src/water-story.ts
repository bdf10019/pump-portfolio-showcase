import * as T from 'three';
import {createLayoutModel} from './water-layout-model';
import {FLOW_ROUTES,flowCurve} from './water-flow-routes';
import {createWaterChevrons} from './water-chevrons';
import type {SystemRoutePhase} from './story-contract';

export function waterStoryWeight(progress:number){
 return T.MathUtils.smoothstep(progress,.2,.48)*(1-T.MathUtils.smoothstep(progress,.68,.86));
}
export function desktopWaterCamera(width:number,height:number){
 const camera=new T.PerspectiveCamera(35,width/height,.1,100);
 const distance=23.6/(2*Math.tan(T.MathUtils.degToRad(17.5))*camera.aspect);
 camera.position.set(0,.7+distance*.914,distance*.406);camera.lookAt(0,.7,0);camera.updateMatrixWorld();
 return camera;
}

export function createStoryWater(flowStyle:'dots'|'chevrons'='dots'){
 const model=createLayoutModel(true,true),root=new T.Group();root.add(model.group);
 const visibility={value:0};
 // Screen-door transition keeps central opaque surfaces depth-correct; no alpha sorting.
 model.group.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const material=o.material as T.MeshStandardMaterial,previous=material.onBeforeCompile.bind(material);
  const previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
   previous(shader,renderer);shader.uniforms.uSystemVisibility=visibility;
   shader.fragmentShader='uniform float uSystemVisibility;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    float screenDoor=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
    if(screenDoor>=uSystemVisibility) discard;`);
  };
  material.customProgramCacheKey=()=>previousKey+'-story-reveal-v1';
 });
 const flows=(flowStyle==='dots'?FLOW_ROUTES:[]).map(({phase,points})=>{
  const curve=flowCurve(points);
  const color=phase==='supply'?0x63d3dc:0x568fab;
  const material=new T.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const line=new T.Mesh(new T.TubeGeometry(curve,120,.024,6,false),material);line.userData.routeGuide=true;line.position.y=.35;root.add(line);
  const dotsMaterial=new T.PointsMaterial({color,size:.075,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(12*3),3));
  const dots=new T.Points(geometry,dotsMaterial);dots.frustumCulled=false;root.add(dots);
  return {phase,curve,line,dots};
 });
 const chevrons=flowStyle==='chevrons'?createWaterChevrons():null;
 if(chevrons)root.add(chevrons.root);
 let disposed=false;
 return {
  root,
  update(weight:number,phase:SystemRoutePhase,time:number,reduced:boolean){
   if(disposed)return;
   visibility.value=weight;root.visible=weight>.002;
   model.group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=weight>.98&&!(o.material as T.Material).transparent;});
   chevrons?.update(weight,phase,time,reduced);
   flows.forEach(flow=>{
    const active=phase==='overview'||phase===flow.phase;
    flow.line.material.opacity=weight*(active?.78:.09);flow.dots.material.opacity=weight*(active?.9:0);
    const positions=flow.dots.geometry.getAttribute('position') as T.BufferAttribute;
    for(let i=0;i<positions.count;i++){const p=flow.curve.getPoint((i/positions.count+(reduced?0:time*.035))%1);positions.setXYZ(i,p.x,p.y+.35,p.z);}
    positions.needsUpdate=true;
   });
  },
  dispose(){if(disposed)return;disposed=true;model.dispose();chevrons?.dispose();flows.forEach(f=>{f.line.geometry.dispose();f.line.material.dispose();f.dots.geometry.dispose();f.dots.material.dispose();});},
 };
}
