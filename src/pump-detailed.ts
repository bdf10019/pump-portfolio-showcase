import * as T from "three";
import { mergeGeometries, mergeVertices, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type PartDefinition={id:string;label:string;function:string;signal:string;truth:string;explode:[number,number,number]};
export type PumpContract={schemaVersion:string;assetId:string;subject:string;units:string;truthStatus:string;parts:PartDefinition[]};
export type PumpModel={root:T.Group;parts:Map<string,T.Group>;setExplode(p:number):void;selectPart(id:string|null):void;dispose():void};
export const DESIGN={version:"0.2.0",axisHeight:1.08,motorFins:32,impellerVanes:7,bearingBalls:12};
const H=DESIGN.axisHeight;
function materials(){
 const mat=(name:string,color:number,metalness:number,roughness:number)=>new T.MeshStandardMaterial({name,color,metalness,roughness,vertexColors:true});
 return {paint:mat("石油藍烤漆鑄鐵",0x174957,.28,.42),dark:mat("石墨烤漆",0x18262d,.3,.46),steel:mat("車削不鏽鋼",0xc2c9cc,.93,.23),bronze:mat("鑄造青銅",0xb88742,.83,.31),rubber:mat("彈性體",0x0b1013,.04,.79),ceramic:mat("軸封陶瓷",0xdbded8,.06,.22),amber:mat("感測器識別環",0xd89232,.52,.33)};
}
type M=ReturnType<typeof materials>;
function add(g:T.Group,geo:T.BufferGeometry,m:T.Material,x=0,y=H,z=0){
 if(geo.type==="ExtrudeGeometry"){const smooth=toCreasedNormals(geo,.65);if(smooth!==geo)geo.dispose();geo=smooth;}
 const o=new T.Mesh(geo,m);o.position.set(x,y,z);g.add(o);return o;
}
function box(g:T.Group,m:T.Material,s:[number,number,number],p:[number,number,number],r=.015){return add(g,new RoundedBoxGeometry(...s,1,r),m,...p);}
function cyl(g:T.Group,m:T.Material,r:number,l:number,x:number,y=H,z=0,n=48){const geo=new T.CylinderGeometry(r,r,l,n);geo.rotateZ(-Math.PI/2);return add(g,geo,m,x,y,z);}
function ring(g:T.Group,m:T.Material,r:number,inner:number,l:number,x:number,y=H,z=0,n=48){
 const b=Math.min(.012,l*.23,(r-inner)*.23);
 const profile=[[inner,-l/2+b],[inner+b,-l/2],[r-b,-l/2],[r,-l/2+b],[r,l/2-b],[r-b,l/2],[inner+b,l/2],[inner,l/2-b],[inner,-l/2+b]].map(([a,t])=>new T.Vector2(a,t));
 const geo=new T.LatheGeometry(profile,n);geo.rotateZ(-Math.PI/2);return add(g,geo,m,x,y,z);
}
function torus(g:T.Group,m:T.Material,r:number,t:number,x:number,y=H,z=0,n=48){const geo=new T.TorusGeometry(r,t,8,n);geo.rotateY(Math.PI/2);return add(g,geo,m,x,y,z);}
function bolt(g:T.Group,m:M,p:[number,number,number],vertical=false,r=.047){
 const w=ring(g,m.steel,r*1.43,r*.64,.016,...p,16),h=cyl(g,m.steel,r,.046,p[0]+.02,p[1],p[2],6);
 if(vertical){w.rotation.z=Math.PI/2;h.rotation.z=Math.PI/2;h.position.set(p[0],p[1]+.028,p[2]);}
}
function bolts(g:T.Group,m:M,x:number,r:number,count:number){for(let i=0;i<count;i++){const a=(i+.5)*Math.PI*2/count;bolt(g,m,[x,H+Math.cos(a)*r,Math.sin(a)*r]);}}
function flange(r:number,inner:number,l:number,n:number){
 const s=new T.Shape();s.absarc(0,0,r,0,Math.PI*2,false);
 const bore=new T.Path();bore.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(bore);
 for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,h=new T.Path();h.absarc(Math.cos(a)*r*.79,Math.sin(a)*r*.79,.036,0,Math.PI*2,true);s.holes.push(h);}
 const geo=new T.ExtrudeGeometry(s,{depth:l,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.009,bevelThickness:.009,curveSegments:n/4});
 geo.translate(0,0,-l/2);geo.rotateY(Math.PI/2);return geo;
}
function volute(m:M,n:number){
 const g=new T.Group(),s=new T.Shape();
 for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,r=.61+.14*i/80;if(i===0)s.moveTo(Math.cos(a)*r,Math.sin(a)*r);else s.lineTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();
 const hole=new T.Path();hole.absarc(0,0,.26,0,Math.PI*2,true);s.holes.push(hole);
 const geo=new T.ExtrudeGeometry(s,{depth:.36,bevelEnabled:true,bevelSize:.075,bevelThickness:.075,bevelSegments:4,curveSegments:n/4});geo.translate(0,0,-.18);geo.rotateY(Math.PI/2);add(g,geo,m.paint,-1.16);
 ring(g,m.dark,.705,.27,.075,-.93,H,0,n);ring(g,m.paint,.71,.3,.055,-.875,H,0,n);bolts(g,m,-.835,.622,12);
 ring(g,m.paint,.305,.252,.45,-1.61,H,0,n);add(g,flange(.46,.252,.095,n),m.paint,-1.88);ring(g,m.steel,.335,.252,.022,-1.945,H,0,n);
 const neck=ring(g,m.paint,.267,.215,.59,-1.09,1.77,.1,n);neck.rotation.z=Math.PI/2;
 const top=add(g,flange(.407,.215,.095,n),m.paint,-1.09,2.1,.1);top.rotation.z=Math.PI/2;
 const face=ring(g,m.steel,.292,.215,.02,-1.09,2.163,.1,n);face.rotation.z=Math.PI/2;
 for(const z of [-.4,.4]){box(g,m.paint,[.65,.19,.27],[-1.12,.35,z],.035);box(g,m.paint,[.3,.43,.12],[-1.1,.55,z],.025);bolt(g,m,[-1.28,.458,z],true);}
 ring(g,m.paint,.345,.255,.56,-.02,H,0,n);box(g,m.paint,[.52,.54,.4],[-.02,.56,0],.035);box(g,m.paint,[.78,.12,.8],[-.02,.31,0]);
 for(const z of [-.31,.31])bolt(g,m,[-.02,.395,z],true);
 const drain=cyl(g,m.steel,.048,.07,-1.19,.49,.43,6);drain.rotation.y=-Math.PI/2;
 return g;
}
function impeller(m:M,n:number){
 const g=new T.Group();ring(g,m.bronze,.527,.115,.045,-1.07,H,0,n);ring(g,m.bronze,.176,.1,.21,-1.18,H,0,n);
 for(let i=0;i<DESIGN.impellerVanes;i++){
  const shape=new T.Shape(),pts:T.Vector2[]=[];
  for(let j=0;j<=18;j++){const t=j/18,a=i*Math.PI*2/7+t*.91,r=.18+t*.325;pts.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r));}
  shape.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>shape.lineTo(p.x,p.y));[...pts].reverse().forEach(p=>shape.lineTo(p.x+.025,p.y+.022));shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.115,steps:1,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2});geo.rotateY(Math.PI/2);add(g,geo,m.bronze,-1.205);
 }return g;
}
function shaft(m:M,n:number){
 const g=new T.Group();cyl(g,m.steel,.095,2.19,-.13,H,0,n);cyl(g,m.steel,.126,.18,-.57,H,0,n);
 box(g,m.steel,[.28,.043,.043],[-.98,H+.09,0],.004);
 for(let i=0;i<10;i++)torus(g,m.steel,.097,.004,-1.17+i*.018,H,0,24);
 for(const x of [-.39,.33])torus(g,m.rubber,.099,.009,x,H,0,32);return g;
}
function bearing(m:M,n:number,x:number){
 const g=new T.Group();ring(g,m.steel,.282,.224,.19,x,H,0,n);ring(g,m.steel,.149,.1,.19,x,H,0,n);
 torus(g,m.bronze,.185,.012,x-.055,H,0,n);torus(g,m.bronze,.185,.012,x+.055,H,0,n);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;add(g,new T.SphereGeometry(.041,n===64?16:10,10),m.steel,x,H+Math.cos(a)*.185,Math.sin(a)*.185);}return g;
}
function seal(m:M,n:number){
 const g=new T.Group();ring(g,m.ceramic,.203,.105,.047,-.72,H,0,n);ring(g,m.rubber,.224,.106,.064,-.66,H,0,n);ring(g,m.steel,.216,.108,.028,-.49,H,0,n);
 const pts:T.Vector3[]=[];for(let i=0;i<=180;i++){const t=i/180,a=t*Math.PI*12;pts.push(new T.Vector3(-.625+t*.12,H+Math.cos(a)*.168,Math.sin(a)*.168));}
 add(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts),n*2,.012,6,false),m.steel,0,0,0);return g;
}
function coupling(m:M,n:number){
 const g=new T.Group();for(const x of [.57,.88]){
 ring(g,m.steel,.232,.099,.19,x,H,0,n);torus(g,m.steel,.228,.011,x,H,0,n);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const jaw=box(g,m.steel,[.17,.08,.09],[x<.7?x+.12:x-.12,H+Math.cos(a)*.17,Math.sin(a)*.17],.012);jaw.rotation.x=a;}
 bolts(g,m,x+.105,.171,3);}ring(g,m.rubber,.201,.11,.096,.725,H,0,n);return g;
}
function motor(m:M,n:number){
 const g=new T.Group();cyl(g,m.paint,.49,1.28,1.58,H,0,n);
 for(let i=0;i<DESIGN.motorFins;i++){const a=i*Math.PI*2/DESIGN.motorFins;const fin=box(g,m.paint,[1.26,.105,.022],[1.58,H+Math.cos(a)*.522,Math.sin(a)*.522],.008);fin.rotation.x=a;}
 for(const x of [.91,2.25]){cyl(g,m.paint,.521,.12,x,H,0,n);ring(g,m.dark,.531,.46,.025,x+(x<1?-.07:.07),H,0,n);bolts(g,m,x+(x<1?-.09:.09),.435,6);}
 ring(g,m.dark,.526,.48,.22,2.4,H,0,n);
 for(const r of [.14,.23,.32,.41,.49])torus(g,m.dark,r,.015,2.525,H,0,n);
 cyl(g,m.dark,.105,.024,2.525,H,0,n);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const spoke=box(g,m.dark,[.024,.41,.022],[2.53,H+Math.cos(a)*.29,Math.sin(a)*.29],.006);spoke.rotation.x=a;}
 box(g,m.paint,[.51,.245,.46],[1.57,1.69,0],.035);box(g,m.dark,[.54,.038,.49],[1.57,1.829,0],.012);
 for(const x of [1.36,1.78])for(const z of [-.185,.185])bolt(g,m,[x,1.857,z],true,.027);
 const gland=cyl(g,m.steel,.067,.13,1.57,1.69,.3,6);gland.rotation.y=-Math.PI/2;
 const cable=new T.CatmullRomCurve3([new T.Vector3(1.57,1.69,.39),new T.Vector3(1.7,1.58,.6),new T.Vector3(2,1.27,.6),new T.Vector3(2.04,.6,.56)]);
 add(g,new T.TubeGeometry(cable,28,.024,8,false),m.rubber,0,0,0);
 for(const x of [1.15,2.03])for(const z of [-.4,.4]){box(g,m.paint,[.3,.31,.21],[x,.47,z],.03);box(g,m.paint,[.45,.095,.32],[x,.285,z]);bolt(g,m,[x,.346,z],true);}
 box(g,m.steel,[.52,.21,.017],[1.58,1.1,.563],.008);
 for(const x of [1.36,1.8])for(const y of [1.03,1.17]){const rivet=cyl(g,m.dark,.013,.018,x,y,.576,12);rivet.rotation.y=-Math.PI/2;}
 for(let i=0;i<4;i++)box(g,m.dark,[.3-i*.04,.009,.004],[1.55,1.16-i*.041,.576],.001);
 return g;
}
function baseplate(m:M){
 const g=new T.Group();box(g,m.dark,[4.7,.14,1.54],[.29,.09,0],.035);
 for(const z of [-.65,.65]){box(g,m.dark,[4.5,.115,.12],[.29,.2,z],.012);for(const x of [-1.69,-.45,1.09,2.28])bolt(g,m,[x,.155,z],true,.046);}
 for(const x of [-1.19,-.02,1.15,2.03])box(g,m.steel,[.25,.032,1.06],[x,.232,0],.006);return g;
}
function sensor(m:M,n:number,x:number,z:number,temp:boolean){
 const g=new T.Group();const mount=cyl(g,m.steel,.079,.082,x,1.438,z,6);mount.rotation.z=Math.PI/2;
 const body=cyl(g,m.steel,.062,.165,x,1.55,z,32);body.rotation.z=Math.PI/2;
 const collar=ring(g,temp?m.amber:m.dark,.065,.044,.027,x,1.608,z,32);collar.rotation.z=Math.PI/2;
 const cap=cyl(g,m.rubber,.043,.058,x,1.673,z,16);cap.rotation.z=Math.PI/2;
 const curve=new T.CatmullRomCurve3([new T.Vector3(x,1.71,z),new T.Vector3(x+.02,1.87,z),new T.Vector3(x+.25,1.79,z+.08),new T.Vector3(x+.3,1.42,z+.22),new T.Vector3(x+.28,.8,z+.4)]);
 add(g,new T.TubeGeometry(curve,n,.013,6,false),m.rubber,0,0,0);return g;
}
function consolidate(group:T.Group){
 const buckets=new Map<T.Material,T.BufferGeometry[]>();
 for(const child of [...group.children]){
  if(!(child instanceof T.Mesh))continue;child.updateMatrix();
  let geo=child.geometry.clone().applyMatrix4(child.matrix);
  if(geo.index){const expanded=geo.toNonIndexed();geo.dispose();geo=expanded;}
  const material=child.material as T.Material,pos=geo.getAttribute("position"),colors=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
   const noise=Math.sin(pos.getX(i)*913+pos.getY(i)*2371+pos.getZ(i)*657)*43758.5453,f=noise-Math.floor(noise);
   const grain=material.name.includes("烤漆")?.935+f*.065:.972+f*.028;colors.set([grain,grain,grain],i*3);
  }
  geo.setAttribute("color",new T.BufferAttribute(colors,3));geo.clearGroups();
  const list=buckets.get(material)??[];list.push(geo);buckets.set(material,list);child.geometry.dispose();
 }
 group.clear();for(const [m,geos] of buckets){const geo=mergeGeometries(geos,false);if(!geo)throw new Error("Geometry merge failed");const indexed=mergeVertices(geo);geo.dispose();const o=add(group,indexed,m,0,0,0);o.castShadow=m.name.includes("烤漆");o.receiveShadow=true;geos.forEach(g=>g.dispose());}
}
export function createPumpModel(contract:PumpContract,quality:"desktop"|"mobile"="desktop"):PumpModel{
 const n=quality==="desktop"?64:32,m=materials(),root=new T.Group(),parts=new Map<string,T.Group>();
 root.name="pump_root";root.userData={assetId:contract.assetId,truthStatus:contract.truthStatus,designVersion:DESIGN.version};
 const factories:Record<string,()=>T.Group>={volute:()=>volute(m,n),impeller:()=>impeller(m,n),shaft:()=>shaft(m,n),bearing_front:()=>bearing(m,n,-.21),bearing_rear:()=>bearing(m,n,.17),mechanical_seal:()=>seal(m,n),coupling:()=>coupling(m,n),motor:()=>motor(m,n),baseplate:()=>baseplate(m),sensor_vibration:()=>sensor(m,n,-.2,.03,false),sensor_temperature:()=>sensor(m,n,.16,-.04,true)};
 for(const d of contract.parts){
  const part=factories[d.id]();consolidate(part);part.name=d.id;part.userData={partId:d.id,basePosition:[0,0,0],explode:d.explode};
  part.traverse(child=>Object.assign(child.userData,{partId:d.id,partLabel:d.label}));parts.set(d.id,part);root.add(part);
 }
 const setExplode=(p:number)=>{const progress=T.MathUtils.clamp(p,0,1);for(const d of contract.parts){const position=parts.get(d.id)!.position;if(progress===0)position.set(0,0,0);else position.fromArray(d.explode).multiplyScalar(progress);}};
 const selectPart=(id:string|null)=>{for(const [key,part] of parts)part.userData.selected=key===id;};
 const dispose=()=>{root.traverse(child=>{if(child instanceof T.Mesh)child.geometry.dispose();});Object.values(m).forEach(mat=>mat.dispose());};
 return {root,parts,setExplode,selectPart,dispose};
}

