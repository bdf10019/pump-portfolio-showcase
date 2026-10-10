import './honeycomb.css';
import {createMaterialSurface,restart,tick,type Clock,type MaterialSurface} from './honeycomb-material';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('material'),pause=el<HTMLButtonElement>('pause'),reduce=el<HTMLButtonElement>('reduce'),read=el<HTMLButtonElement>('read'),query=matchMedia('(prefers-reduced-motion:reduce)');
let clock:Clock=restart(query.matches),manualReduced=false,reading=false,surface:MaterialSurface|null=null,raf=0,last:number|null=null,disposed=false;
const reduced=()=>manualReduced||query.matches;
function update(){pause.textContent=clock.playing?'暫停光源':'播放光源';pause.disabled=reduced()||!surface;reduce.disabled=query.matches||!surface;reduce.textContent=query.matches?'系統減少動態':manualReduced?'恢復動態':'減少動態';reduce.setAttribute('aria-pressed',String(reduced()));read.setAttribute('aria-pressed',String(reading));el('reading').hidden=!reading;document.body.dataset.phase=clock.playing?'playing':'paused';document.body.dataset.reduced=String(reduced());document.body.dataset.reading=String(reading);document.body.dataset.elapsed=clock.time.toFixed(3);surface?.render(clock.time,reading);}
function loop(now:number){if(disposed)return;if(clock.playing&&!document.hidden){if(last!==null)clock=tick(clock,(now-last)/1000);last=now;update();raf=requestAnimationFrame(loop);}else{raf=0;last=null;}}
function schedule(){cancelAnimationFrame(raf);last=null;update();if(clock.playing&&!document.hidden&&!disposed)raf=requestAnimationFrame(loop);}
pause.addEventListener('click',()=>{if(!reduced()){clock={...clock,playing:!clock.playing};schedule();}});
el('restart').addEventListener('click',()=>{clock=restart(reduced());schedule();});
reduce.addEventListener('click',()=>{manualReduced=!manualReduced;if(reduced())clock={...clock,playing:false};schedule();});
read.addEventListener('click',()=>{reading=!reading;update();});
query.addEventListener('change',()=>{if(reduced())clock={...clock,playing:false};schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clock={...clock,playing:false};schedule();}});
window.addEventListener('resize',()=>{surface?.resize();update();});
function initialize(){try{surface=createMaterialSurface(canvas);el('status').textContent='Canvas 材質就緒';}catch{clock={...clock,playing:false};el('status').textContent='固定深色背景／材質初始化失敗';pause.disabled=true;reduce.disabled=true;el<HTMLButtonElement>('restart').disabled=true;}schedule();}
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);surface?.dispose();surface=null;});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;clock={...clock,playing:false};initialize();}});
initialize();
