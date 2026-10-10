import './water-layout.css';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPumpModel,type PumpContract} from './pump-detailed';
import {createLayoutModel,makeCamera,margins,inspectEnvelope,LABELS} from './water-layout-model';
const need=<E extends Element>(s:string)=>{const e=document.querySelector<E>(s);if(!e)throw new Error(s);return e;};
const canvas=need<HTMLCanvasElement>('#layout-canvas'),stage=need<HTMLElement>('.stage'),status=need<HTMLElement>('#status');
const yaw=need<HTMLInputElement>('#yaw'),pitch=need<HTMLInputElement>('#pitch'),follow=need<HTMLInputElement>('#follow');
const metrics=need<HTMLElement>('#metrics'),sweepResult=need<HTMLElement>('#sweep-result');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
async function start(){
 const r=await fetch('/assets/pump-core-v1/pump-core-parts-v1.json');if(!r.ok)throw new Error('水泵素材載入失敗');
 const contract=await r.json() as PumpContract;
 const renderer=new T.WebGLRenderer({canvas,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.setClearColor(0x0b1217);const scene=new T.Scene(),world=new T.Group();scene.add(world);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);
 scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 const atmosphere=new T.Fog(0x0b1217,23,65);
 let camera=makeCamera(stage.clientWidth,stage.clientHeight);
 const detail=need<HTMLInputElement>('#detail');detail.checked=new URLSearchParams(location.search).get('mode')!=='gray';
 const finish=need<HTMLInputElement>('#finish'),fade=need<HTMLInputElement>('#fade');
 finish.checked=new URLSearchParams(location.search).get('mode')!=='gray';
 let model=createLayoutModel(detail.checked,finish.checked);const pump=createPumpModel(contract,'desktop');world.add(model.group,pump.root);
 const ground=new T.Mesh(new T.PlaneGeometry(25,13),new T.ShadowMaterial({color:0x000000,opacity:.16}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.receiveShadow=true;world.add(ground);
 const updateAppearance=()=>{model.setFade(fade.checked);scene.fog=fade.checked?atmosphere:null;scene.environmentIntensity=finish.checked?.65:0;renderer.shadowMap.enabled=finish.checked;ground.visible=finish.checked;stage.classList.toggle('no-fade',!fade.checked);canvas.dataset.finish=String(finish.checked);canvas.dataset.fade=String(fade.checked);};
 const updateStatus=()=>{status.textContent=`${finish.checked?'PBR 材質':detail.checked?'設備細節':'灰模'}就緒 · 固定棚光 · 四個外部接口`;canvas.dataset.detail=String(detail.checked);};
 function rebuild(){world.remove(model.group);model.dispose();model=createLayoutModel(detail.checked,finish.checked);world.add(model.group);updateAppearance();updateStatus();}
 detail.addEventListener('change',rebuild);finish.addEventListener('change',rebuild);
 const hemisphere=new T.HemisphereLight(0xd8e9f2,0x253440,1.25);scene.add(hemisphere);
 const key=new T.DirectionalLight(0xfff1dd,3);key.position.set(-8.1,14.1,11.6);scene.add(key);
 key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:9,bottom:-9,near:1,far:55});key.shadow.bias=-.0003;key.shadow.normalBias=.035;
 const rim=new T.DirectionalLight(0xb2ddeb,1.8);rim.position.set(4,8,-7);scene.add(rim);
 const labelHost=need<HTMLElement>('#labels');const labels=LABELS.map(def=>{const element=document.createElement('span');element.className='label';element.textContent=def.name;labelHost.append(element);return {def,element};});
 let frame=0,targetYaw=0,targetPitch=0,currentYaw=0,currentPitch=0,disposed=false;
 let report=inspectEnvelope(stage.clientWidth,stage.clientHeight);
 const resize=()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera=makeCamera(stage.clientWidth,stage.clientHeight);};resize();
 function sync(){follow.checked=false;targetYaw=Number(yaw.value);targetPitch=Number(pitch.value);}
 yaw.addEventListener('input',sync);pitch.addEventListener('input',sync);
 need('#reset').addEventListener('click',()=>{yaw.value='0';pitch.value='0';sync();});
 fade.addEventListener('change',updateAppearance);
 stage.addEventListener('pointermove',e=>{if(!follow.checked||reduced.matches)return;const rect=stage.getBoundingClientRect();targetYaw=T.MathUtils.clamp((e.clientX-rect.left)/rect.width*16-8,-8,8);targetPitch=T.MathUtils.clamp((e.clientY-rect.top)/rect.height*8-4,-4,4);});
 stage.addEventListener('pointerleave',()=>{if(follow.checked){targetYaw=0;targetPitch=0;}});
 follow.addEventListener('change',()=>{targetYaw=0;targetPitch=0;});
 function sweep(){report=inspectEnvelope(stage.clientWidth,stage.clientHeight);sweepResult.textContent=`${report.passed?'通過':'未通過'}：${report.samples} 組角度 × ${report.endpoints} 個管口；最小外延 ${(report.minimumMargin*100).toFixed(1)}%，連續角度保守下界 ${(report.continuousMinimum*100).toFixed(1)}%，中立 ${(report.neutralMargin*100).toFixed(1)}%。`;sweepResult.dataset.result=JSON.stringify(report);}
 need('#sweep').addEventListener('click',sweep);
 function draw(){if(disposed)return;frame=requestAnimationFrame(draw);currentYaw=T.MathUtils.lerp(currentYaw,targetYaw,reduced.matches?1:.13);currentPitch=T.MathUtils.lerp(currentPitch,targetPitch,reduced.matches?1:.13);world.rotation.set(T.MathUtils.degToRad(currentPitch),T.MathUtils.degToRad(currentYaw),0,'YXZ');world.updateMatrixWorld(true);
  need<HTMLOutputElement>('#yaw-value').textContent=`${currentYaw.toFixed(1)}°`;need<HTMLOutputElement>('#pitch-value').textContent=`${currentPitch.toFixed(1)}°`;
  for(const {def,element} of labels){const p=new T.Vector3(...def.point).applyMatrix4(world.matrixWorld).project(camera);element.style.left=`${(p.x+1)*50}%`;element.style.top=`${(1-p.y)*50}%`;}
  renderer.render(scene,camera);
  const min=Math.min(...margins(camera,currentYaw,currentPitch).map(m=>m.margin));
  metrics.textContent=`${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles · 管口最小外延 ${(min*100).toFixed(1)}%`;
  canvas.dataset.yaw=currentYaw.toFixed(2);canvas.dataset.pitch=currentPitch.toFixed(2);canvas.dataset.margin=min.toFixed(4);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
 }
 addEventListener('resize',resize);addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);removeEventListener('resize',resize);pump.dispose();model.dispose();ground.geometry.dispose();ground.material.dispose();environment.dispose();key.shadow.dispose();renderer.dispose();},{once:true});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;cancelAnimationFrame(frame);status.textContent='3D 已中斷，下方配置圖仍可閱讀';});
 updateAppearance();updateStatus();draw();sweep();
}
void start().catch(e=>{status.textContent=`預覽無法載入：${e instanceof Error?e.message:'請重新整理'}。可閱讀下方配置圖。`;});
