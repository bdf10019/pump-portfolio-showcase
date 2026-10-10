import './scroll-story.css';
import './intro-story.css';
import './text-reveal.css';
import {createTextReveal} from './text-reveal';
import {sliceAdvance} from './slice-advance';
import {INTRO_VERSION,SLICES,TIMING,getSliceState,narrativeFrame,progressAtAnchor,curtainLift,type SliceGeometry} from './intro-contract';
import {strongAppearance} from './intro-appearance';
import type {StorySceneController} from './story-scene';

const canvas=document.querySelector<HTMLCanvasElement>('#story-canvas')!,stage=document.querySelector<HTMLElement>('#visual-stage')!;
const status=document.querySelector<HTMLElement>('#status')!,poster=document.querySelector<HTMLElement>('#poster')!,motion=document.querySelector<HTMLButtonElement>('#motion')!;
const sections=[...document.querySelectorAll<HTMLElement>('section[data-slice]')],hero=document.querySelector<HTMLElement>('#hero')!;
const reducedQuery=matchMedia('(prefers-reduced-motion:reduce)'),desktopQuery=matchMedia('(min-width:1100px) and (min-height:700px)');
const params=new URLSearchParams(location.search),staticMode=params.get('mode')==='static',failureMode=params.get('mode')==='fallback';
const textReveal=createTextReveal(sections);
const advance=document.querySelector<HTMLElement>('#slice-advance')!;
let controller:StorySceneController|null=null,manualReduced=false,pending=false,geometries:SliceGeometry[]=[],progress=0,disposed=false,initializing=false,lastSlice='';
document.documentElement.classList.remove('no-js');
document.body.dataset.version=INTRO_VERSION;
document.body.style.setProperty('--slice-dwell',`${TIMING.dwellVh}svh`);
document.body.style.setProperty('--slice-bridge',`${TIMING.bridgeVh}svh`);
const reduced=()=>manualReduced||reducedQuery.matches;
function measure(){geometries=sections.map((section,index)=>{const rect=section.getBoundingClientRect(),start=rect.top+scrollY;return{id:SLICES[index].id,start,end:start+Math.max(rect.height,1)};});}
function update(){
 pending=false;if(disposed)return;
 progress=progressAtAnchor(geometries,scrollY+innerHeight*.5);
 const {slice,index,local,copyOpacity}=getSliceState(progress),lift=curtainLift(progress,reduced());
 const next=sliceAdvance(geometries,scrollY,innerHeight),percent=Math.round(next.amount*100);
 advance.hidden=next.inFooter;advance.style.setProperty('--advance',String(next.amount));advance.setAttribute('aria-valuenow',String(percent));
 advance.setAttribute('aria-valuetext',`${slice.label}｜${percent}%｜${SLICES[index+1]?.title??'即將進入頁尾'}`);
 document.body.dataset.advance=next.amount.toFixed(5);document.body.dataset.inFooter=String(next.inFooter);
 document.body.dataset.scene=slice.chapter;document.body.dataset.slice=slice.id;document.body.dataset.routePhase=slice.route;
 if(slice.signal)document.body.dataset.signal=slice.signal;else delete document.body.dataset.signal;
 document.body.dataset.reduced=String(reduced());document.body.dataset.curtainLift=lift.toFixed(5);
 document.body.style.setProperty('--copy-opacity',String(reduced()?1:copyOpacity));
 document.body.style.setProperty('--curtain-shift',`${-lift*100}%`);
 document.body.dataset.sliceProgress=local.toFixed(5);document.body.dataset.storyProgress=progress.toFixed(6);
 sections.forEach(section=>section.classList.toggle('is-active',section.dataset.slice===slice.id));
 hero.classList.toggle('is-revealed',slice.id==='intro'&&lift>0);
 textReveal.setStable(reduced()||!desktopQuery.matches||staticMode||failureMode||document.body.classList.contains('is-fallback'));
 textReveal.enter(slice.id==='intro'&&lift>0?'hero':slice.id);
 if(lastSlice!==slice.id){lastSlice=slice.id;document.querySelector('#slice-label')!.textContent=slice.label;document.querySelector('#slice-title')!.textContent=slice.title;document.querySelector('#slice-count')!.textContent=`${index+1} / ${SLICES.length}`;}
 controller?.setProgress(progress);
}
function schedule(){if(!pending&&!disposed){pending=true;requestAnimationFrame(update);}}
function updateMotion(){motion.setAttribute('aria-pressed',String(reduced()));motion.disabled=reducedQuery.matches;motion.textContent=reducedQuery.matches?'系統已減少動態':manualReduced?'恢復動態':'減少動態';controller?.setReducedMotion(reduced());update();}
function fallback(message:string){controller?.dispose();controller=null;textReveal.setStable(true);document.body.classList.add('is-fallback');document.body.dataset.renderMode=staticMode?'static':failureMode?'simulated-fallback':'fallback';poster.classList.remove('is-hidden');canvas.classList.remove('is-ready');status.textContent='靜態閱讀';status.title=message;}
async function initialize(){
 if(disposed||controller||initializing)return;
 if(!desktopQuery.matches){document.body.dataset.renderMode='text-only';status.textContent='靜態閱讀';return;}
 if(staticMode||failureMode){fallback(staticMode?'指定靜態模式':'模擬初始化失敗');return;}
 initializing=true;
 try{const {createStoryScene}=await import('./story-scene');if(disposed)return;
  const created=await createStoryScene({canvas,stage,reducedMotion:reduced(),scrollNarrative:narrativeFrame,partAppearance:strongAppearance,waterFlowStyle:'chevrons',darkGround:true,onReady:()=>{},onFailure:fallback});
  if(disposed){created.dispose();return;}controller=created;controller.setProgress(progress);document.body.dataset.renderMode='3d';document.body.classList.remove('is-fallback');canvas.classList.add('is-ready');poster.classList.add('is-hidden');status.textContent='3D 就緒';
 }catch(error){if(!disposed)fallback(error instanceof Error?error.message:'3D 無法載入');}finally{initializing=false;}
}
motion.addEventListener('click',()=>{manualReduced=!manualReduced;updateMotion();});
reducedQuery.addEventListener('change',updateMotion);
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',()=>{measure();controller?.resize();schedule();void initialize();});
window.addEventListener('load',()=>{measure();update();});
window.addEventListener('hashchange',schedule);
void document.fonts.ready.then(()=>{measure();update();});
window.addEventListener('pagehide',()=>{disposed=true;controller?.dispose();controller=null;});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;measure();update();void initialize();}});
measure();updateMotion();void initialize();
