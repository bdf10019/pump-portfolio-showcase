import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {createSurfaceTexture,fadeMaterial} from './water-appearance';
export type Point = [number,number,number];
export const PIPE_RADIUS = .14;
export const ENDPOINTS: {id:string;side:'left'|'right';point:Point}[] = [
 {id:'process-return',side:'left',point:[-22,1.08,0]},
 {id:'process-supply',side:'right',point:[22,1.18,1.15]},
 {id:'utility-in',side:'right',point:[22,1.15,-3.5]},
 {id:'utility-out',side:'right',point:[22,.65,-2.8]},
];
export const LABELS: {name:string;point:Point}[] = [
 {name:'回水閥／過濾器',point:[-8.7,2.2,0]},
 {name:'空氣分離器',point:[-6.3,2.4,0]},
 {name:'支管膨脹桶',point:[-5.3,1.8,2.6]},
 {name:'EQ-PUMP-001',point:[.3,.2,1.5]},
 {name:'止回／隔離閥',point:[2.8,3,-1.7]},
 {name:'板式熱交換器',point:[7,2.9,-.45]},
 {name:'冷源側接口',point:[10,1.6,-3.3]},
];
export function makeCamera(width:number,height:number) {
 const camera=new T.OrthographicCamera(-11.8,11.8,11.8*height/width,-11.8*height/width,.1,100);
 camera.position.set(0,18,8);camera.lookAt(0,.7,0);camera.updateMatrixWorld();return camera;
}
export function rotationMatrix(yaw:number,pitch:number) {
 return new T.Matrix4().makeRotationFromEuler(new T.Euler(T.MathUtils.degToRad(pitch),T.MathUtils.degToRad(yaw),0,'YXZ'));
}
export function margins(camera:T.Camera,yaw:number,pitch:number) {
 const matrix=rotationMatrix(yaw,pitch);
 return ENDPOINTS.map(endpoint=>{
  // Include the entire cross-section, not just the pipe centre.
  let margin=Infinity;
  for(let i=0;i<32;i++){
   const a=i*Math.PI/16,p=new T.Vector3(...endpoint.point);
   p.y+=Math.cos(a)*PIPE_RADIUS;p.z+=Math.sin(a)*PIPE_RADIUS;
   p.applyMatrix4(matrix).project(camera);
   margin=Math.min(margin,endpoint.side==='left'?(-1-p.x)/2:(p.x-1)/2);
  }
  return {id:endpoint.id,margin};
 });
}
export function inspectEnvelope(width:number,height:number) {
 const camera=makeCamera(width,height);let minimum=Infinity,worst={yaw:0,pitch:0,id:''};let samples=0;
 for(let yaw=-8;yaw<=8;yaw+=.5)for(let pitch=-4;pitch<=4;pitch+=.5){
  samples++;
  for(const result of margins(camera,yaw,pitch))if(result.margin<minimum){minimum=result.margin;worst={yaw,pitch,id:result.id};}
 }
 const neutral=Math.min(...margins(camera,0,0).map(r=>r.margin));
 // Conservative bound over the continuous YXZ angle range, including cap radius.
 // Camera has no yaw: screen X equals world X for this orthographic proof.
 const a=T.MathUtils.degToRad(8),b=T.MathUtils.degToRad(4);
 const continuousMinimum=Math.min(...ENDPOINTS.map(({point:[x,y,z]})=>
  ((Math.cos(a)*Math.abs(x)-Math.sin(a)*(Math.sin(b)*(Math.abs(y)+PIPE_RADIUS)+Math.abs(z)+PIPE_RADIUS))/11.8-1)/2));
 return {width,height,samples,endpoints:ENDPOINTS.length,neutralMargin:neutral,minimumMargin:minimum,continuousMinimum,worst,passed:neutral>=.18&&minimum>=.06&&continuousMinimum>=.06};
}
export function createLayoutModel(detailed=false,finished=false){
 const group=new T.Group(),bucket=new Map<T.Material,T.BufferGeometry[]>();
 const texture=finished?createSurfaceTexture():null;
 const gray=new T.MeshStandardMaterial({name:'藍綠環氧烤漆',color:finished?0x24515a:0x82939c,roughness:finished?.43:.72,metalness:finished?.28:.2,roughnessMap:texture});
 const dark=new T.MeshStandardMaterial({name:'深灰結構鋼',color:finished?0x28373c:0x384b57,roughness:.58,metalness:finished?.5:0,roughnessMap:texture});
 const light=new T.MeshStandardMaterial({name:'不鏽鋼與鍍鋅件',color:0xc1c8cc,roughness:finished?.29:.55,metalness:finished?.88:.4,roughnessMap:texture});
 const rubber=finished?new T.MeshStandardMaterial({name:'黑色橡膠',color:0x15191a,roughness:.92,metalness:0}):dark;
 const red=finished?new T.MeshStandardMaterial({name:'灰紅烤漆膨脹桶',color:0x76444a,roughness:.4,metalness:.18,roughnessMap:texture}):gray;
 const handle=finished?new T.MeshStandardMaterial({name:'低飽和工業黃手輪',color:0xa38b4c,roughness:.48,metalness:.23}):dark;
 const dial=finished?new T.MeshStandardMaterial({name:'儀表象牙白面盤',color:0xe3dfcd,roughness:.64,metalness:0}):light;
 const fades=[fadeMaterial(gray),fadeMaterial(dark)];
 function shape(geometry:T.BufferGeometry,material:T.Material,position:Point,rotation:Point=[0,0,0]){
  const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
  geometry.applyMatrix4(matrix);const list=bucket.get(material)??[];list.push(geometry);bucket.set(material,list);
 }
 function box(size:Point,p:Point,mat=gray){shape(new T.BoxGeometry(...size),mat,p);}
 function cylinder(r:number,h:number,p:Point,mat=gray,rotation:Point=[0,0,0]){shape(new T.CylinderGeometry(r,r,h,20),mat,p,rotation);}
 function pipe(points:Point[],radius=PIPE_RADIUS,mat=gray){
  const curve=new T.CurvePath<T.Vector3>();
  // Small quadratic elbows avoid spline overshoot through equipment.
  let start=new T.Vector3(...points[0]);
  for(let i=1;i<points.length-1;i++){
   const corner=new T.Vector3(...points[i]),next=new T.Vector3(...points[i+1]);
   const r=Math.min(.32,start.distanceTo(corner)*.3,corner.distanceTo(next)*.3);
   const before=corner.clone().add(start.clone().sub(corner).normalize().multiplyScalar(r));
   const after=corner.clone().add(next.clone().sub(corner).normalize().multiplyScalar(r));
   curve.add(new T.LineCurve3(start,before));curve.add(new T.QuadraticBezierCurve3(before,corner,after));start=after;
  }
  curve.add(new T.LineCurve3(start,new T.Vector3(...points[points.length-1])));
  shape(new T.TubeGeometry(curve,Math.max(16,points.length*12),radius,12,false),mat,[0,0,0]);
 }
 // Main loop: return inlet, pump outlet, heat exchanger, external supply.
 pipe([[-22,1.08,0],[-12.5,1.08,0]],.14,finished?fades[0].material:gray);
 pipe([[-12.5,1.08,0],[-2.18,1.08,0]],.14);
 shape(new T.CylinderGeometry(.14,.255,.3,24),gray,[-2.03,1.08,0],[0,0,-Math.PI/2]);
 pipe([[-1.09,2.18,0],[-1.09,2.7,0],[-1.09,2.7,-1.7],[5.6,2.7,-1.7],[5.6,1.18,.35],[6.4,1.18,.35]]);
 pipe([[7.6,1.18,.35],[8.1,1.18,.35],[8.1,1.18,1.15],[12.5,1.18,1.15]]);
 pipe([[12.5,1.18,1.15],[22,1.18,1.15]],.14,finished?fades[0].material:gray);
 // Separate utility circuit: the heat exchanger has four connected ports.
 pipe([[6.4,1.15,-1.25],[5.95,1.15,-1.25],[5.95,1.15,-3.5],[12.5,1.15,-3.5]],.12,dark);
 pipe([[7.6,.65,-1.25],[8.4,.65,-1.25],[8.4,.65,-2.8],[12.5,.65,-2.8]],.12,dark);
 pipe([[12.5,1.15,-3.5],[22,1.15,-3.5]],.12,finished?fades[1].material:dark);
 pipe([[12.5,.65,-2.8],[22,.65,-2.8]],.12,finished?fades[1].material:dark);
 // Expansion vessel is on a branch at the suction side, not inline.
 pipe([[-5.3,1.08,0],[-5.3,1.08,2.6],[-5.3,1.5,2.6]],.065);
 cylinder(.53,1.12,[-5.3,.92,2.6],red);
 shape(new T.SphereGeometry(.53,20,12),red,[-5.3,1.47,2.6]);
 cylinder(.4,.15,[-5.3,.24,2.6],dark);
 cylinder(.36,1.15,[-6.5,1.18,0]);cylinder(.1,.3,[-6.5,1.9,0],light);
 pipe([[-6.5,.6,0],[-6.5,.32,.3]],.05,dark);
 // Filter and three valves: coarse proportions; no bolt/detail pass yet.
 cylinder(.22,.65,[-8.5,1.08,0],gray,[0,0,Math.PI/2]);
 pipe([[-8.5,1.08,0],[-8.15,.55,.3]],.18);cylinder(.23,.1,[-8.15,.55,.3],dark);
 for(const p of [[-9.6,1.08,0],[1.7,2.7,-1.7],[3.4,2.7,-1.7]] as Point[]){
  cylinder(.24,.4,p,dark,[0,0,Math.PI/2]);
  if(p[0]===1.7){box([.36,.12,.3],[p[0],p[1]+.25,p[2]],light);continue;}
  cylinder(.045,.35,[p[0],p[1]+.3,p[2]],light);
  shape(new T.TorusGeometry(.25,.035,6,20),handle,[p[0],p[1]+.49,p[2]],[Math.PI/2,0,0]);
 }
 for(const x of [-9.85,-9.35,-8.85,-8.1,-6.95,-6.05,-2.2,1.4,2,3.1,3.7]){
  const out=x>0;cylinder(.23,.09,[x,out?2.7:1.08,out?-1.7:0],light,[0,0,Math.PI/2]);
 }
 // Instrument stems and round gauge placeholders.
 for(const x of [.6,4.5]){cylinder(.045,.36,[x,2.97,-1.7],light);cylinder(.19,.1,[x,3.2,-1.7],light,[Math.PI/2,0,0]);}
 box(detailed?[.99,1.68,1.62]:[1.05,1.85,1.8],[7,1.22,-.45]);
 for(const x of [6.42,7.58])box([.13,2.15,1.95],[x,1.28,-.45],dark);
 for(const y of [.48,2.08])for(const z of [-1.25,.35])cylinder(.045,1.42,[7,y,z],light,[0,0,Math.PI/2]);
 for(const [x,pipeY,z] of [[-8,1.08,0],[-4,1.08,0],[4.4,2.7,-1.7]] as Point[]){
  const height=pipeY-PIPE_RADIUS;
  box([.1,height,.1],[x,height/2,z],dark);box([.7,.08,.6],[x,.04,z],dark);
  box([.55,.08,.4],[x,height,z],dark);
 }
 for(const x of [6.4,7.6])box([.45,.2,2.15],[x,.1,-.45],dark);
 if(detailed){
  // Repeated detail is merged by material; the core routing remains identical.
  const flange=(x:number,y:number,z:number,r=.25)=>{
   cylinder(r,.07,[x,y,z],light,[0,0,Math.PI/2]);
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,by=y+Math.cos(a)*r*.8,bz=z+Math.sin(a)*r*.8;
    shape(new T.CylinderGeometry(.031,.031,.14,6),light,[x,by,bz],[0,0,Math.PI/2]);
    shape(new T.CylinderGeometry(.038,.038,.024,6),dark,[x+.07,by,bz],[0,0,Math.PI/2]);
   }
  };
  for(const x of [-9.85,-9.35,-8.85,-8.1,-6.95,-6.05,-2.2,1.4,2,3.1,3.7])flange(x,x>0?2.7:1.08,x>0?-1.7:0);
  // Rubber connector corrugations with restrained coupling rings.
  for(const x of [-3.05,-2.99,-2.93,-2.87,-2.81])shape(new T.TorusGeometry(.157,.022,8,24),rubber,[x,1.08,0],[0,Math.PI/2,0]);
  flange(-3.18,1.08,0);flange(-2.65,1.08,0);
  // Handwheel spokes, cast necks and bolted bonnet of the check valve.
  for(const [x,y,z] of [[-9.6,1.08,0],[3.4,2.7,-1.7]] as Point[]){
   cylinder(.095,.14,[x,y+.24,z],gray);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;pipe([[x,y+.49,z],[x+Math.cos(a)*.24,y+.49,z+Math.sin(a)*.24]],.018,handle);}
   cylinder(.075,.08,[x,y+.49,z],light);
  }
  for(const x of [1.57,1.83])for(const z of [-1.81,-1.59])shape(new T.CylinderGeometry(.032,.032,.05,6),dark,[x,3.04,z]);
  // Strainer cleanout closure, drain plug and cover bolts.
  for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(.033,.08,[-8.15+Math.cos(a)*.18,.61,.3+Math.sin(a)*.18],light);}
  cylinder(.065,.12,[-8.15,.43,.3],light);
  // Air separator collar, vent float housing and relief branch stub.
  for(const y of [.72,1.61])shape(new T.TorusGeometry(.355,.025,8,24),light,[-6.5,y,0],[Math.PI/2,0,0]);
  cylinder(.12,.2,[-6.5,2.05,0],gray);cylinder(.075,.075,[-6.5,2.19,0],dark);
  pipe([[-5.3,1.08,1.1],[-4.85,1.08,1.1],[-4.85,1.45,1.1]],.06,light);
  cylinder(.11,.25,[-4.85,1.53,1.1],gray);cylinder(.13,.07,[-4.85,1.69,1.1],dark);
  pipe([[-4.75,1.52,1.1],[-4.53,1.52,1.1],[-4.53,.4,1.1]],.05,light);
  // Vessel seam, three mounting legs, nameplate and capped charging port.
  shape(new T.TorusGeometry(.531,.015,8,36),light,[-5.3,1.24,2.6],[Math.PI/2,0,0]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;box([.1,.3,.1],[-5.3+Math.cos(a)*.35,.25,2.6+Math.sin(a)*.35],dark);}
  box([.25,.21,.03],[-5.3,1.02,3.14],dark);cylinder(.035,.08,[-5.3,2.03,2.6],light);
  // Gauge faces point upward/frontward so the tilt reveals the bezel and dial.
  for(const x of [.6,4.5]){
   if(finished)cylinder(.17,.012,[x,3.2,-1.647],dial,[Math.PI/2,0,0]);
   shape(new T.TorusGeometry(.187,.019,8,32),light,[x,3.2,-1.641]);
   for(let i=0;i<13;i++){const a=Math.PI*.15+i*Math.PI*1.7/12;box([.014,.032,.01],[x+Math.sin(a)*.14,3.2+Math.cos(a)*.14,-1.638],dark);}
   pipe([[x,3.2,-1.635],[x-.07,3.28,-1.635]],.012,dark);
   box([.026,.026,.013],[x,3.2,-1.63],dark);
  }
  // Plate edges, compression tie nuts and four gasketed connection ports.
  for(let i=0;i<24;i++){const x=6.5+i*.043;box([.015,1.79,1.76],[x,1.22,-.45],light);}
  for(const x of [6.25,7.75])for(const y of [.48,2.08])for(const z of [-1.25,.35]){
   shape(new T.CylinderGeometry(.085,.085,.1,6),light,[x,y,z],[0,0,Math.PI/2]);
  }
  for(const x of [6.34,7.66])for(const [y,z] of [[1.18,.35],[x<7?1.15:.65,-1.25]])flange(x,y,z,.23);
  // Saddles around supported pipe sections, base anchors and modest weld seams.
  for(const [x,y,z] of [[-8,1.08,0],[-4,1.08,0],[4.4,2.7,-1.7]] as Point[]){
   shape(new T.TorusGeometry(.17,.022,8,24),dark,[x,y,z],[0,Math.PI/2,0]);
   for(const dx of [-.24,.24])shape(new T.CylinderGeometry(.035,.035,.08,6),light,[x+dx,.09,z]);
  }
  for(const x of [-10.8,-7.5,-4.2,9.5])shape(new T.TorusGeometry(.143,.009,6,24),light,[x,x>0?1.18:1.08,x>0?1.15:0],[0,Math.PI/2,0]);
 }
 for(const [material,geometries] of bucket){
  const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('水路合併失敗');
  const mesh=new T.Mesh(merged,material);mesh.castShadow=finished&&!material.transparent;mesh.receiveShadow=finished;
  group.add(mesh);geometries.forEach(g=>g.dispose());
 }
 return {group,setFade(enabled:boolean){fades.forEach(f=>f.setEnabled(enabled));},dispose(){group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});new Set([gray,dark,light,rubber,red,handle,dial,...fades.map(f=>f.material)]).forEach(m=>m.dispose());texture?.dispose();}};
}
