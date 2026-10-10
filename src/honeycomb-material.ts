export type Point={x:number;y:number};
export type Light=Point&{radius:number;strength:number};
export type Clock={time:number;playing:boolean};
export type RGB=readonly [number,number,number];
export type LightPalette={name:string;colors:readonly [RGB,RGB,RGB,RGB];mix?:number};
export type MaterialOptions={speedMultiplier?:number;palette?:(time:number)=>LightPalette};
const ORANGE_PALETTE:LightPalette={name:'orange-red',colors:[[255,93,28],[245,54,11],[180,27,4],[107,14,1]]};
const safe=(n:number)=>Number.isFinite(n)&&n>0?n:1;
export function tick(clock:Clock,delta:number):Clock{return clock.playing&&Number.isFinite(delta)&&delta>0?{...clock,time:clock.time+Math.min(delta,.25)}:clock;}
export function restart(reduced:boolean):Clock{return{time:0,playing:!reduced};}
export function hexPoints(x:number,y:number,r:number):Point[]{return Array.from({length:6},(_,i)=>({x:x+Math.cos((i*60-90)*Math.PI/180)*r,y:y+Math.sin((i*60-90)*Math.PI/180)*r}));}
export const LIGHT_RADIUS_MULTIPLIER=1.2;
export const LIGHT_SPEED_MULTIPLIER=1.2;
// The former primary light used angular frequency .13. Preserve that base
// half-cycle as the reference duration for one complete horizontal pass.
export const BASE_PASS_SECONDS=Math.PI/.13;
export const SWEEP_SECONDS=2*BASE_PASS_SECONDS/LIGHT_SPEED_MULTIPLIER;
export function lightsAt(time:number,width:number,height:number):Light[]{
 const t=Number.isFinite(time)?Math.max(0,time):0,w=safe(width),h=safe(height),radius=Math.min(w,h)*.39*LIGHT_RADIUS_MULTIPLIER;
 const phase=(t%SWEEP_SECONDS)/SWEEP_SECONDS;
 const shifted=(phase+.25)%1,progress=1-Math.abs(2*shifted-1);
 // Start in the middle, cross the right edge, return across the whole view,
 // then cross the left edge. Turnarounds happen completely off screen.
 return[{x:-radius+(w+2*radius)*progress,y:h*.5,radius,strength:1}];
}
export function influence(distance:number,radius:number){if(!Number.isFinite(distance)||!Number.isFinite(radius)||radius<=0)return 0;const d=Math.max(0,distance)/radius;return Math.exp(-4*d*d);}
export function rasterSize(width:number,height:number,dpr:number){const w=safe(width),h=safe(height),ratio=Math.min(1.5,safe(dpr),1920/w,1080/h);return{width:Math.max(1,Math.round(w*ratio)),height:Math.max(1,Math.round(h*ratio)),ratio};}
export type MaterialSurface={render(time:number,reading:boolean):void;resize():void;dispose():void};
export function createMaterialSurface(canvas:HTMLCanvasElement,options:MaterialOptions={}):MaterialSurface{
 const availableContext=canvas.getContext('2d',{alpha:false});if(!availableContext)throw new Error('Canvas unavailable');const ctx=availableContext;
 const make=()=>document.createElement('canvas');
 const surface=make(),gapMask=make(),edgeMask=make(),lightLayer=make(),edgeLayer=make(),grain=make();
 const surfaceCtx=surface.getContext('2d')!,gapCtx=gapMask.getContext('2d')!,edgeCtx=edgeMask.getContext('2d')!,lightCtx=lightLayer.getContext('2d')!,rimCtx=edgeLayer.getContext('2d')!;
 let width=1,height=1,ratio=1,disposed=false;
 const polygon=(c:CanvasRenderingContext2D,x:number,y:number,r:number)=>{const points=hexPoints(x,y,r);c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();};
 grain.width=grain.height=96;const gc=grain.getContext('2d')!;let seed=1979;
 for(let i=0;i<5000;i++){seed=(seed*1664525+1013904223)>>>0;const x=(seed>>>16)%96;seed=(seed*1664525+1013904223)>>>0;const shade=(seed>>>15)%2?255:0;gc.fillStyle=`rgba(${shade},${shade},${shade},.035)`;gc.fillRect(x,(seed>>>16)%96,1,1);}
 function resize(){if(disposed)return;const box=canvas.getBoundingClientRect(),size=rasterSize(box.width,box.height,devicePixelRatio);width=size.width;height=size.height;ratio=size.ratio;
  for(const layer of [canvas,surface,gapMask,edgeMask,lightLayer,edgeLayer]){layer.width=width;layer.height=height;}
  surfaceCtx.fillStyle='#06080a';surfaceCtx.fillRect(0,0,width,height);gapCtx.fillStyle='#fff';gapCtx.fillRect(0,0,width,height);gapCtx.globalCompositeOperation='destination-out';edgeCtx.fillStyle='#fff';
  const r=34*ratio,dx=Math.sqrt(3)*r,dy=1.5*r,texture=surfaceCtx.createPattern(grain,'repeat')!;
  for(let row=-1;row<height/dy+2;row++){for(let col=-1;col<width/dx+2;col++){const x=col*dx+(row%2?dx/2:0),y=row*dy;
   const gradient=surfaceCtx.createLinearGradient(x-r,y-r,x+r,y+r);gradient.addColorStop(0,'#191c1f');gradient.addColorStop(.48,'#111417');gradient.addColorStop(1,'#0b0e10');polygon(surfaceCtx,x,y,r-1.45*ratio);surfaceCtx.fillStyle=gradient;surfaceCtx.fill();surfaceCtx.strokeStyle='#25292c';surfaceCtx.lineWidth=.7*ratio;surfaceCtx.stroke();surfaceCtx.fillStyle=texture;surfaceCtx.fill();
   polygon(gapCtx,x,y,r-1.45*ratio);gapCtx.fill();polygon(edgeCtx,x,y,r-1.1*ratio);edgeCtx.fill();
  }}
  edgeCtx.globalCompositeOperation='destination-out';for(let row=-1;row<height/dy+2;row++){for(let col=-1;col<width/dx+2;col++){polygon(edgeCtx,col*dx+(row%2?dx/2:0),row*dy,r-3.3*ratio);edgeCtx.fill();}}
  gapCtx.globalCompositeOperation='source-over';edgeCtx.globalCompositeOperation='source-over';canvas.dataset.raster=`${width}x${height}`;
 }
 function render(time:number,reading:boolean){if(disposed)return;lightCtx.clearRect(0,0,width,height);
  const pathTime=time*safe(options.speedMultiplier??1),lights=lightsAt(pathTime,width,height),palette=options.palette?.(time)??ORANGE_PALETTE;
  for(const l of lights){const glow=lightCtx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.radius);[0,.24,.52,.78].forEach((stop,i)=>glow.addColorStop(stop,`rgba(${palette.colors[i].join(',')},${l.strength*influence(l.radius*stop,l.radius)})`));glow.addColorStop(1,'rgba(0,0,0,0)');lightCtx.globalCompositeOperation='lighter';lightCtx.fillStyle=glow;lightCtx.fillRect(l.x-l.radius,l.y-l.radius,l.radius*2,l.radius*2);}
  lightCtx.globalCompositeOperation='source-over';if(reading){const attenuation=lightCtx.createRadialGradient(width*.5,height*.43,0,width*.5,height*.43,Math.min(width*.42,height*.62));attenuation.addColorStop(0,'rgba(0,0,0,.86)');attenuation.addColorStop(.45,'rgba(0,0,0,.8)');attenuation.addColorStop(1,'rgba(0,0,0,0)');lightCtx.globalCompositeOperation='destination-out';lightCtx.fillStyle=attenuation;lightCtx.fillRect(0,0,width,height);}
  rimCtx.clearRect(0,0,width,height);rimCtx.drawImage(lightLayer,0,0);rimCtx.globalCompositeOperation='destination-in';rimCtx.drawImage(edgeMask,0,0);rimCtx.globalCompositeOperation='source-over';lightCtx.globalCompositeOperation='destination-in';lightCtx.drawImage(gapMask,0,0);lightCtx.globalCompositeOperation='source-over';
  ctx.globalCompositeOperation='source-over';ctx.drawImage(surface,0,0);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.2;ctx.drawImage(edgeLayer,0,0);ctx.globalAlpha=1;ctx.drawImage(lightLayer,0,0);ctx.globalCompositeOperation='source-over';
  const vignette=ctx.createRadialGradient(width*.5,height*.48,height*.08,width*.5,height*.48,Math.max(width,height)*.7);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.45)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  canvas.dataset.sceneTime=time.toFixed(3);canvas.dataset.lights=lights.map(l=>`${l.x.toFixed(1)},${l.y.toFixed(1)}`).join(';');canvas.dataset.lightCount=String(lights.length);canvas.dataset.lightRadius=lights[0].radius.toFixed(3);
  canvas.dataset.pathTime=pathTime.toFixed(3);canvas.dataset.lightTheme=palette.name;canvas.dataset.colorMix=(palette.mix??1).toFixed(3);canvas.dataset.lightColor=palette.colors[0].join(',');
 }
 function dispose(){if(disposed)return;disposed=true;for(const layer of [surface,gapMask,edgeMask,lightLayer,edgeLayer,grain])layer.width=layer.height=1;}
 resize();return{render,resize,dispose};
}
