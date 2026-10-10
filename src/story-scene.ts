import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createPumpModel, type PumpContract } from "./pump-detailed";
import { getStableStoryProgress, getStoryState, type StoryState, type SignalId, type SystemRoutePhase, type Vec3Tuple } from "./story-contract";
import {createStoryWater,desktopWaterCamera,waterStoryWeight} from './water-story';
import {margins,LABELS} from './water-layout-model';
import {createResourceAudit} from './resource-audit';
import {createPartPresentation,type PartAppearance} from './scroll-parts';
import type {PartFrame,PartId} from './scroll-presentation';

export type StoryFrame = { progress: number; calls: number; triangles: number; yaw: number; pitch: number };

type StorySceneOptions = {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  reducedMotion: boolean;
  onReady: () => void;
  onFailure: (message: string) => void;
  onFrame?: (frame: StoryFrame) => void;
  onDispose?: (report: { tracked: number; released: number; remaining: number }) => void;
  // Local acceptance harness only; the production coordinator never supplies this.
  acceptancePointer?: () => { x: number; y: number } | null;
  // Opt-in candidate adapter. The frozen story coordinator keeps the original behaviour.
  scrollNarrative?: (progress: number, reduced: boolean) => { sceneProgress: number; state: StoryState; signal: SignalId | null; parts?:PartFrame };
  // New candidate only; omitted keeps the original candidate material treatment.
  partAppearance?: PartAppearance;
  waterFlowStyle?: 'dots'|'chevrons';
  // A-only floor: opt-in, never changes the existing story defaults.
  darkGround?: boolean;
};

export type StorySceneController = {
  setProgress(progress: number): void;
  setSignal(signal: SignalId): void;
  setReducedMotion(reduced: boolean): void;
  resize(): void;
  dispose(): void;
};

const vec = (value: Vec3Tuple) => new THREE.Vector3(...value);

export function createStoryFloorMaterial(darkGround=false,transparent=false){
  return new THREE.MeshStandardMaterial({color:darkGround?0x020405:0x081012,metalness:darkGround?0:0.12,roughness:darkGround?1:0.88,envMapIntensity:darkGround?0:1,transparent});
}

export async function createStoryScene(options: StorySceneOptions): Promise<StorySceneController> {
  if (!WebGL.isWebGL2Available()) throw new Error("此瀏覽器無法建立 WebGL 2，已保留靜態水路海報與完整文字。");

  const response = await fetch("/assets/pump-core-v1/pump-core-parts-v1.json");
  if (!response.ok) throw new Error("水泵零件契約載入失敗，已切換靜態模式。");
  const contract = (await response.json()) as PumpContract;
  const mobile = window.matchMedia("(max-width: 720px)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const desktopPresentation = window.matchMedia("(min-width: 1100px) and (min-height: 700px)");
  const detailedDesktop=desktopPresentation.matches;

  const renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: !mobile, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.72;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x071012, 0.018);
  const camera = new THREE.PerspectiveCamera(mobile ? 43 : 35, 1, 0.1, 80);
  camera.position.set(-5.6, 3.15, 6.7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(environmentScene, 0.035);
  scene.environment = environmentTarget.texture;
  environmentScene.dispose();
  pmrem.dispose();

  const world = new THREE.Group();
  scene.add(world);
  const pump = createPumpModel(contract, mobile ? "mobile" : "desktop");
  world.add(pump.root);
  const detailedWater=detailedDesktop?createStoryWater(options.waterFlowStyle):null;
  if(detailedWater)world.add(detailedWater.root);
  const labelHost=document.createElement('div');labelHost.className='water-labels';labelHost.setAttribute('aria-hidden','true');
  if(detailedDesktop)options.stage.append(labelHost);
  const labels=detailedDesktop?LABELS.map(def=>{const element=document.createElement('span');element.textContent=def.name;labelHost.append(element);return {def,element};}):[];
  let waterCamera=desktopWaterCamera(Math.max(options.stage.clientWidth,1),Math.max(options.stage.clientHeight,1));
  options.canvas.dataset.pumpInstances = "1";

  const supplyPipeMaterial = new THREE.MeshStandardMaterial({ color: 0x4aa9b8, metalness: 0.72, roughness: 0.34, transparent: true, opacity: 0 });
  const returnPipeMaterial = new THREE.MeshStandardMaterial({ color: 0x264b61, metalness: 0.72, roughness: 0.34, transparent: true, opacity: 0 });
  const equipmentMaterial = new THREE.MeshStandardMaterial({ color: 0x26373d, metalness: 0.54, roughness: 0.46, transparent: true, opacity: 0 });
  const waterMaterial = new THREE.PointsMaterial({ color: 0x62d9e9, size: mobile ? 0.065 : 0.085, transparent: true, opacity: 0, sizeAttenuation: true });
  const systemGroup = new THREE.Group();
  systemGroup.name = "closed_loop_system";
  world.add(systemGroup);
  const supplyCurves: THREE.CatmullRomCurve3[] = [];
  const returnCurves: THREE.CatmullRomCurve3[] = [];

  function pipe(points: THREE.Vector3[], phase: Exclude<SystemRoutePhase, "overview">) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    (phase === "supply" ? supplyCurves : returnCurves).push(curve);
    const geometry = new THREE.TubeGeometry(curve, mobile ? 42 : 72, 0.09, mobile ? 8 : 12, false);
    const mesh = new THREE.Mesh(geometry, phase === "supply" ? supplyPipeMaterial : returnPipeMaterial);
    mesh.receiveShadow = true;
    systemGroup.add(mesh);
  }

  if(!detailedDesktop){
  pipe([
    new THREE.Vector3(-4.15, 0.66, 0.1), new THREE.Vector3(-3.2, 0.66, 0.1),
    new THREE.Vector3(-2.55, 0.75, 0.08), new THREE.Vector3(-1.95, 1.08, 0),
  ], "supply");
  pipe([
    new THREE.Vector3(-1.09, 2.18, 0.1), new THREE.Vector3(-1.05, 2.62, -0.15),
    new THREE.Vector3(0.2, 2.65, -2.35), new THREE.Vector3(3.55, 1.9, -2.35), new THREE.Vector3(3.55, 0.72, 0),
  ], "supply");
  pipe([
    new THREE.Vector3(3.55, 0.72, 0), new THREE.Vector3(3.55, 0.72, 2.35),
    new THREE.Vector3(-3.75, 0.72, 2.35), new THREE.Vector3(-4.15, 0.66, 0.1),
  ], "return");

  const tank = new THREE.Group();
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 1.25, mobile ? 24 : 40), equipmentMaterial);
  tankBody.position.set(-4.15, 0.68, 0.1);
  tankBody.castShadow = !mobile;
  tank.add(tankBody);
  const tankTop = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 8, mobile ? 24 : 40), returnPipeMaterial);
  tankTop.rotation.x = Math.PI / 2;
  tankTop.position.set(-4.15, 1.31, 0.1);
  tank.add(tankTop);
  systemGroup.add(tank);

  const exchanger = new THREE.Group();
  const exchangerBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.35, 0.76), equipmentMaterial);
  exchangerBody.position.set(3.55, 0.78, 0);
  exchangerBody.castShadow = !mobile;
  exchanger.add(exchangerBody);
  for (let index = -2; index <= 2; index += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.075, 0.86), supplyPipeMaterial);
    fin.position.set(3.55, 0.78 + index * 0.2, 0);
    exchanger.add(fin);
  }
  systemGroup.add(exchanger);

  for (const position of [[-2.85, 0.76, 0.08], [0.25, 2.65, -2.35], [3.55, 0.72, 1.25]] as Vec3Tuple[]) {
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 24), equipmentMaterial);
    valve.position.set(...position);
    valve.rotation.x = Math.PI / 2;
    systemGroup.add(valve);
  }
  }

  function makeFlow(count: number, material: THREE.PointsMaterial) {
    const positions = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    systemGroup.add(new THREE.Points(geometry, material));
    return { count, geometry };
  }
  const flow = makeFlow(mobile ? 18 : 30, waterMaterial);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(options.scrollNarrative?50:16,options.scrollNarrative?30:11),
    createStoryFloorMaterial(options.darkGround,detailedDesktop),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);
  const waterGround=detailedDesktop?new THREE.Mesh(new THREE.PlaneGeometry(50,30),new THREE.ShadowMaterial({color:0x000000,opacity:0})):null;
  if(waterGround){waterGround.rotation.x=-Math.PI/2;waterGround.position.y=-.06;waterGround.receiveShadow=true;scene.add(waterGround);}

  const keyLight = new THREE.DirectionalLight(0xfff2df, 2.6);
  keyLight.position.set(-4.4, 6.4, 5.2);
  keyLight.target.position.set(0, 0.9, 0);
  keyLight.castShadow = !mobile;
  keyLight.shadow.mapSize.set(detailedDesktop?2048:mobile ? 512 : 1536, detailedDesktop?2048:mobile ? 512 : 1536);
  keyLight.shadow.camera.left = detailedDesktop?-13:-6;
  keyLight.shadow.camera.right = detailedDesktop?13:6;
  keyLight.shadow.camera.top = detailedDesktop?9:5;
  keyLight.shadow.camera.bottom = detailedDesktop?-9:-3;
  keyLight.shadow.normalBias=.035;keyLight.shadow.bias=-.0003;
  scene.add(keyLight, keyLight.target);
  const fillLight = new THREE.DirectionalLight(0xc7efff, 0.62);
  fillLight.position.set(5, 2.4, 4);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffc996, 1.4);
  rimLight.position.set(2, 4, -5);
  scene.add(rimLight);
  scene.add(new THREE.HemisphereLight(0x7899a1, 0x080b0c, 0.52));

  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xeda34e, transparent: true, opacity: 0, depthWrite: false });
  const safeMaterial = new THREE.MeshBasicMaterial({ color: 0x5bd3e5, transparent: true, opacity: 0, depthWrite: false });
  const markers = new Map<SignalId, THREE.Group>();

  function makeMarker(id: SignalId, position: Vec3Tuple, radius: number, material: THREE.MeshBasicMaterial) {
    const group = new THREE.Group();
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + index * 0.075, 0.012, 8, 48), material);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    }
    group.position.set(...position);
    group.userData.signal = id;
    world.add(group);
    markers.set(id, group);
  }
  makeMarker("vibration", [-0.2, 1.45, 0.03], 0.3, markerMaterial);
  makeMarker("temperature", [0.16, 1.45, -0.04], 0.3, markerMaterial);
  makeMarker("safety", [0.2, 1.0, 0], 1.36, safeMaterial);

  let activeSignal: SignalId = "vibration";
  let targetProgress = 0;
  let renderedProgress = 0;
  let reduced = options.reducedMotion;
  let disposed = false;
  let running = !document.hidden;
  let frame = 0;
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const timer = new THREE.Timer();
  timer.connect(document);
  const cameraTarget = new THREE.Vector3();
  const audit = options.onDispose ? createResourceAudit() : null;
  audit?.scene(scene);
  // RenderTarget owns its texture: disposal is signalled by the target, not Texture.dispose().
  audit?.track(environmentTarget);
  [supplyPipeMaterial,returnPipeMaterial,equipmentMaterial].forEach(material=>audit?.material(material));
  const partPresentation=options.scrollNarrative?createPartPresentation(pump,options.partAppearance):null;
  partPresentation?.materials.forEach(material=>audit?.material(material));
  const partLabels=document.createElement('div');partLabels.className='part-labels';partLabels.setAttribute('aria-hidden','true');
  const partSpans=Array.from({length:3},()=>{const span=document.createElement('span');partLabels.append(span);return span;});
  if(partPresentation)options.stage.append(partLabels);
  let peakCalls=0,peakTriangles=0,renderedFrames=0;

  function resize() {
    const width = Math.max(options.stage.clientWidth, 1);
    const height = Math.max(options.stage.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if(detailedDesktop)waterCamera=desktopWaterCamera(width,height);
  }

  function updateSystemOpacity(opacity: number, phase: SystemRoutePhase) {
    const value = THREE.MathUtils.clamp(opacity, 0, 1);
    const supplyWeight = phase === "return" ? 0.2 : 1;
    const returnWeight = phase === "supply" ? 0.2 : 1;
    supplyPipeMaterial.opacity = value * supplyWeight;
    returnPipeMaterial.opacity = value * returnWeight;
    equipmentMaterial.opacity = value;
    waterMaterial.opacity = value * 0.94;
    systemGroup.visible = !detailedDesktop&&value > 0.002;
  }

  function updateFlowSet(time: number, flow: { count: number; geometry: THREE.BufferGeometry }, curves: THREE.CatmullRomCurve3[]) {
    const attribute = flow.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < flow.count; index += 1) {
      const curve = curves[index % curves.length];
      const point = curve.getPoint((index / flow.count + time * 0.035) % 1);
      attribute.setXYZ(index, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
  }

  function updateFlow(time: number, phase: SystemRoutePhase) {
    if(detailedDesktop)return;
    if (reduced || waterMaterial.opacity < 0.02) return;
    const activeCurves = phase === "supply" ? supplyCurves : phase === "return" ? returnCurves : [...supplyCurves, ...returnCurves];
    updateFlowSet(time, flow, activeCurves);
  }

  function updateMarkers(opacity: number, time: number) {
    markerMaterial.opacity=activeSignal==='safety'?0:opacity*.72;
    safeMaterial.opacity=activeSignal==='safety'?opacity*.48:0;
    markers.forEach((group, id) => {
      group.visible = id === activeSignal && opacity > 0.02;
      const pulse = reduced ? 1 : 1 + Math.sin(time * 2.4) * 0.055;
      group.scale.setScalar(pulse);
      group.rotation.x = reduced ? 0 : Math.sin(time * 0.38) * 0.05;
    });
  }

  function render() {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (!running) return;
    timer.update();
    const delta = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    const destination = options.scrollNarrative ? targetProgress : reduced ? getStableStoryProgress(targetProgress) : targetProgress;
    const easing = options.scrollNarrative || reduced ? 1 : 1 - Math.exp(-delta * 5.4);
    renderedProgress = THREE.MathUtils.lerp(renderedProgress, destination, easing);
    const narrative=options.scrollNarrative?.(renderedProgress,reduced);
    const sceneProgress=narrative?.sceneProgress??renderedProgress;
    const state = narrative?.state??getStoryState(renderedProgress);
    if(narrative?.signal){activeSignal=narrative.signal;options.canvas.dataset.signal=activeSignal;}
    else if(narrative)delete options.canvas.dataset.signal;
    options.canvas.dataset.shot = state.shot;
    options.canvas.dataset.routePhase = state.systemRoutePhase;

    const cameraPosition = vec(state.camera);
    const focus = vec(state.target);
    const waterWeight=detailedDesktop?waterStoryWeight(sceneProgress):0;
    const explode=narrative?.parts?.explode??0;
    if(partPresentation&&narrative?.parts){
      partPresentation.update(narrative.parts,elapsed,reduced);
      options.canvas.dataset.explode=explode.toFixed(4);
      options.canvas.dataset.highlightWeights=JSON.stringify(narrative.parts.weights);
      options.canvas.dataset.pulse=String(narrative.parts.pulse);
    }
    if(options.scrollNarrative){
      // Reserve the right-hand copy column without changing the active legacy camera.
      const copyRoom=THREE.MathUtils.smoothstep(sceneProgress,.7,.94);
      const width=options.canvas.clientWidth,height=options.canvas.clientHeight;
      camera.zoom=THREE.MathUtils.lerp(1,.76,copyRoom)*THREE.MathUtils.lerp(1,.85,explode);
      camera.setViewOffset(width,height,width*.16*copyRoom,0,width,height);
      camera.updateProjectionMatrix();
    }
    const desktopHeroWeight = desktopPresentation.matches
      ? THREE.MathUtils.smoothstep(0.34 - sceneProgress, 0, 0.14)
      : 0;
    focus.x -= desktopHeroWeight * 1.55;
    focus.y += desktopHeroWeight * 0.03;
    cameraPosition.z += desktopHeroWeight * 0.28;
    if(detailedDesktop){
      cameraPosition.lerp(waterCamera.position,waterWeight);focus.lerp(new THREE.Vector3(0,.7,0),waterWeight);
    }
    if (state.scene === "signals") {
      const signalTargets: Record<SignalId, THREE.Vector3> = {
        vibration: new THREE.Vector3(-0.2, 1.28, 0.03),
        temperature: new THREE.Vector3(0.16, 1.38, -0.04),
        safety: new THREE.Vector3(0.2, 1.02, 0),
      };
      focus.lerp(signalTargets[activeSignal], 0.48 * state.signalOpacity);
      if(partPresentation){cameraPosition.lerp(new THREE.Vector3(-3.6,3.8,9.2),explode);focus.lerp(new THREE.Vector3(.15,1.15,0),explode);}
    }
    if (!options.scrollNarrative && !reduced && finePointer) {
      pointer.lerp(pointerTarget, 0.07);
      cameraPosition.x += pointer.x * 0.18*(1-waterWeight);
      cameraPosition.y += pointer.y * 0.09*(1-waterWeight);
      if(!detailedDesktop){keyLight.position.x = -4.4 + pointer.x * 1.15;keyLight.position.y = 6.4 + pointer.y * 0.55;}
    }
    const acceptancePointer=options.acceptancePointer?.();
    if(acceptancePointer&&!reduced)pointer.set(THREE.MathUtils.clamp(acceptancePointer.x,-1,1),THREE.MathUtils.clamp(acceptancePointer.y,-1,1));
    camera.position.lerp(cameraPosition, options.scrollNarrative || reduced ? 1 : desktopPresentation.matches ? 0.095 : 0.11);
    cameraTarget.lerp(focus, options.scrollNarrative || reduced ? 1 : desktopPresentation.matches ? 0.11 : 0.13);
    camera.lookAt(cameraTarget);
    pump.root.scale.setScalar(detailedDesktop?1:state.pumpScale * (mobile ? 0.83 : 1));
    pump.root.rotation.y = detailedDesktop?state.pumpRotation*(1-waterWeight):state.pumpRotation;
    if(detailedDesktop){
      world.rotation.set(THREE.MathUtils.degToRad(pointer.y*4*waterWeight),THREE.MathUtils.degToRad(pointer.x*8*waterWeight),0,'YXZ');
      keyLight.position.set(-4.4,6.4,5.2).lerp(new THREE.Vector3(-8.1,14.1,11.6),waterWeight);
      rimLight.position.set(2,4,-5).lerp(new THREE.Vector3(4,8,-7),waterWeight);
      rimLight.color.set(0xffc996).lerp(new THREE.Color(0xb2ddeb),waterWeight);
      floor.material.opacity=(options.darkGround ? .22 : 1)*(1-waterWeight)*(options.partAppearance?1-.88*(narrative?.parts?.dim??0):1);floor.visible=waterWeight<.999;
      options.canvas.dataset.groundMode=options.darkGround?'matte-dark':'original';
      if(waterGround){waterGround.material.opacity=.16*waterWeight;waterGround.visible=waterWeight>.002;}
      scene.environmentIntensity=THREE.MathUtils.lerp(1,.65,waterWeight);
      detailedWater!.update(waterWeight,state.systemRoutePhase,elapsed,reduced);
      options.canvas.dataset.waterWeight=waterWeight.toFixed(4);
      if(options.waterFlowStyle==='chevrons'){options.canvas.dataset.flowGuide='chevrons';options.canvas.dataset.flowTime=(reduced?0:elapsed).toFixed(3);}
      options.canvas.dataset.waterYaw=(pointer.x*8*waterWeight).toFixed(2);
      options.canvas.dataset.waterPitch=(pointer.y*4*waterWeight).toFixed(2);
      options.stage.style.setProperty('--water-weight',waterWeight.toFixed(4));
    }
    keyLight.intensity = state.keyIntensity + desktopHeroWeight * 0.15;
    renderer.toneMappingExposure = THREE.MathUtils.lerp(state.exposure + desktopHeroWeight * 0.025,1,waterWeight);
    updateSystemOpacity(state.systemOpacity, state.systemRoutePhase);
    updateFlow(elapsed, state.systemRoutePhase);
    updateMarkers(partPresentation?0:state.signalOpacity, elapsed);
    if(detailedDesktop){
      world.updateMatrixWorld(true);camera.updateMatrixWorld();labelHost.style.opacity=String(waterWeight);
      for(const {def,element} of labels){const p=new THREE.Vector3(...def.point).applyMatrix4(world.matrixWorld).project(camera);element.style.left=`${(p.x+1)*50}%`;element.style.top=`${(1-p.y)*50}%`;element.style.visibility=waterWeight>.95&&Math.abs(p.x)<.96&&Math.abs(p.y)<.85?'visible':'hidden';}
    }
    if(partPresentation&&narrative?.parts){
      world.updateMatrixWorld(true);camera.updateMatrixWorld();
      partSpans.forEach((span,index)=>{
        const id=narrative.parts!.labels[index];span.hidden=!id||state.scene!=='signals';if(!id)return;
        const point=partPresentation.anchor(id).project(camera);
        const names:Partial<Record<PartId,string>>={sensor_vibration:'振動感測器 · 來源',sensor_temperature:'溫度感測器 · 來源',bearing_front:'前軸承 · 待複核',bearing_rear:'後軸承 · 待複核',mechanical_seal:'軸封 · 未發現洩漏',motor:'馬達 · 未發現火花／焦味'};
        span.textContent=names[id]??id;span.dataset.partId=id;
        const offset=index===0?-38:index===1?42:-4;
        span.style.left=`${(point.x+1)*50}%`;span.style.top=`calc(${(1-point.y)*50}% + ${offset}px)`;
        span.style.opacity=String(state.scene==='signals'?1:0);
      });
    }
    renderer.render(scene, camera);
    peakCalls=Math.max(peakCalls,renderer.info.render.calls);
    peakTriangles=Math.max(peakTriangles,renderer.info.render.triangles);
    options.canvas.dataset.peakCalls=String(peakCalls);
    options.canvas.dataset.peakTriangles=String(peakTriangles);
    options.canvas.dataset.renderedFrames=String(++renderedFrames);
    options.onFrame?.({progress:renderedProgress,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,yaw:pointer.x*8*waterWeight,pitch:pointer.y*4*waterWeight});
    if (frame % 30 === 0) {
      options.canvas.dataset.drawCalls = String(renderer.info.render.calls);
      options.canvas.dataset.triangles = String(renderer.info.render.triangles);
      options.canvas.dataset.dpr = String(renderer.getPixelRatio());
      if(detailedDesktop&&waterWeight>.999){camera.updateMatrixWorld();options.canvas.dataset.pipeMargin=String(Math.min(...margins(camera,pointer.x*8,pointer.y*4).map(m=>m.margin)));}
      else delete options.canvas.dataset.pipeMargin;
    }
  }

  function setProgress(progress: number) {
    targetProgress = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  }

  function setSignal(signal: SignalId) {
    activeSignal = signal;
    options.canvas.dataset.signal = signal;
  }

  function setReducedMotion(value: boolean) {
    reduced = value;
    pointer.set(0, 0);
    pointerTarget.set(0, 0);
  }

  function onPointerMove(event: PointerEvent) {
    if (options.scrollNarrative || !finePointer || reduced) return;
    if(detailedDesktop&&event.target instanceof Element&&event.target.closest('.story-nav,.system-card,.signal-selector')){pointerTarget.set(0,0);return;}
    pointerTarget.set((event.clientX / window.innerWidth - 0.5) * 2, -(event.clientY / window.innerHeight - 0.5) * 2);
    pointerTarget.clampScalar(-1, 1);
  }

  function onPointerLeave() {
    pointerTarget.set(0, 0);
  }

  function onVisibility() {
    running = !document.hidden;
    if (running) timer.reset();
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    running = false;
    options.onFailure("WebGL context 已中斷，保留靜態海報與文字內容。");
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener('blur',onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    options.canvas.removeEventListener("webglcontextlost", onContextLost);
    partPresentation?.dispose();
    pump.dispose();
    world.remove(pump.root);
    if(detailedWater){world.remove(detailedWater.root);detailedWater.dispose();}
    audit?.track(keyLight.shadow.map);
    keyLight.shadow.dispose();
    labelHost.remove();
    partLabels.remove();
    timer.dispose();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    // In detailed mode these legacy materials have no meshes and are not traversed above.
    if(detailedDesktop)[supplyPipeMaterial,returnPipeMaterial,equipmentMaterial].forEach(material=>material.dispose());
    environmentTarget.dispose();
    renderer.dispose();
    if(audit)options.onDispose?.(audit.finish());
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);
  window.addEventListener('blur',onPointerLeave);
  document.addEventListener("visibilitychange", onVisibility);
  options.canvas.addEventListener("webglcontextlost", onContextLost);
  resize();
  updateSystemOpacity(0, "overview");
  updateMarkers(0, 0);
  renderer.render(scene, camera);
  options.onReady();
  render();

  return { setProgress, setSignal, setReducedMotion, resize, dispose };
}
