import * as T from 'three';
import {createPumpModel,type PumpContract} from './pump-detailed';
import {createAssemblyPumpModel} from './reel-assembly-model';
import {createAssemblyController,ASSEMBLY_SECONDS,ASSEMBLY_COMPLETE} from './reel-assembly';
export type ReelScene={render(time:number,wire:boolean,reduced:boolean):void;resize():void;dispose():void};
export const cloneReelMaterial=(material:T.Material):T.Material=>material.clone();
export const reelCameraScale=(aspect:number)=>Number.isFinite(aspect)&&aspect>0?Math.max(1,1.15/Math.max(.2,aspect)):1;
export async function createReelScene(canvas:HTMLCanvasElement,onFailure:()=>void):Promise<ReelScene>{
 const response=await fetch('/assets/pump-core-v1/pump-core-parts-v1.json',{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Model contract unavailable');
 const contract=await response.json() as PumpContract;
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(33,1,.1,60),pump=createPumpModel(contract,'desktop');scene.add(pump.root);
 const fine=createAssemblyPumpModel(contract),assembly=createAssemblyController(fine);scene.add(fine.root);
 const ghost=pump.root.clone(true),ghostMaterial=new T.MeshBasicMaterial({color:0x5f859d,transparent:true,opacity:.035,depthWrite:false,toneMapped:false}),edgeMaterial=new T.LineBasicMaterial({color:0x91d4ef,transparent:true,opacity:.25,depthWrite:false,toneMapped:false}),internalMaterial=new T.MeshBasicMaterial({color:0xa5deef,wireframe:true,transparent:true,opacity:.022,depthWrite:false,toneMapped:false}),edges=new T.Group(),edgeGeometries:T.BufferGeometry[]=[];
 ghost.traverse(obj=>{if(obj instanceof T.Mesh){obj.material=ghostMaterial;const geo=new T.EdgesGeometry(obj.geometry,25);edgeGeometries.push(geo);const outline=new T.LineSegments(geo,edgeMaterial);outline.position.copy(obj.position);outline.quaternion.copy(obj.quaternion);edges.add(outline);}});scene.add(ghost,edges);
 const internalGhost=new T.Group();fine.parts.get('motor')?.traverse(obj=>{if(obj instanceof T.Mesh&&/定子|轉子|轉軸|風扇/.test(obj.name)){const clone=new T.Mesh(obj.geometry,internalMaterial);clone.position.copy(obj.position);clone.quaternion.copy(obj.quaternion);internalGhost.add(clone);}});scene.add(internalGhost);
 const originals:Array<{mesh:T.Mesh;material:T.Material|T.Material[]}>=[],clones:T.Material[]=[];
 pump.root.traverse(obj=>{if(obj instanceof T.Mesh){originals.push({mesh:obj,material:obj.material});const clone=(material:T.Material)=>{const m=cloneReelMaterial(material);clones.push(m);return m;};obj.material=Array.isArray(obj.material)?obj.material.map(clone):clone(obj.material);}});
 const key=new T.DirectionalLight(0xffffff,4);key.position.set(-4,6,7);scene.add(key);const rim=new T.DirectionalLight(0xffffff,3);rim.position.set(4,5,-3);scene.add(rim);scene.add(new T.HemisphereLight(0xffffff,0x111111,1));
 let disposed=false;
 function resize(){const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(width<=1||height<=1)return;const rackCamera=camera.clone(),fit=reelCameraScale(camera.aspect)*1.22;rackCamera.position.set(.2-4.2*fit,1+2*fit,6.6*fit);rackCamera.lookAt(.2,1,0);const status=assembly.layout(rackCamera,width,height);canvas.dataset.rackLeft=String(status.left);canvas.dataset.rackRight=String(status.right);canvas.dataset.rackScale=status.scale.toFixed(4);}
 function render(time:number,wire:boolean,reduced:boolean){if(disposed)return;const intro=time<ASSEMBLY_SECONDS,local=intro?time:time-ASSEMBLY_SECONDS;fine.root.visible=intro;pump.root.visible=!intro;ghost.visible=intro&&!reduced&&time<ASSEMBLY_COMPLETE;internalGhost.visible=edges.visible=ghost.visible;const ghostAlpha=1-T.MathUtils.clamp((time-5.7)/.6,0,1);ghostMaterial.opacity=.035*ghostAlpha;edgeMaterial.opacity=.25*ghostAlpha;internalMaterial.opacity=.022*ghostAlpha;
  if(intro){const status=assembly.apply(time,reduced);canvas.dataset.assemblyInstalled=String(status.installed);canvas.dataset.assemblyTotal=String(status.total);canvas.dataset.assemblyComplete=String(status.complete);}else{canvas.dataset.assemblyComplete='true';}
  clones.forEach(m=>{if(m instanceof T.MeshStandardMaterial||m instanceof T.MeshBasicMaterial)m.wireframe=wire&&!reduced;});pump.root.rotation.y=reduced?0:Math.sin(local*.22)*.22;fine.root.rotation.y=0;
  const fit=reelCameraScale(camera.aspect)*(intro&&!reduced?1.22-.22*T.MathUtils.smoothstep(time,ASSEMBLY_COMPLETE,ASSEMBLY_SECONDS):1);camera.position.set(.2-4.2*fit,1+2*fit,6.6*fit);camera.lookAt(.2,1,0);renderer.render(scene,camera);canvas.dataset.sceneTime=time.toFixed(3);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.lines=String(renderer.info.render.lines);canvas.dataset.assemblyPhase=intro?reduced?'static-complete':time<.6?'xray':time<ASSEMBLY_COMPLETE?'assembling':'complete':'legacy';}
 function lost(event:Event){event.preventDefault();onFailure();}
 canvas.addEventListener('webglcontextlost',lost);
 function dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);originals.forEach(({mesh,material})=>mesh.material=material);clones.forEach(m=>m.dispose());assembly.dispose();fine.dispose();ghostMaterial.dispose();edgeMaterial.dispose();internalMaterial.dispose();edgeGeometries.forEach(g=>g.dispose());pump.dispose();renderer.dispose();}
 resize();return{resize,render,dispose};
}
