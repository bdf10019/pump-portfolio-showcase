import './scroll-story.css';
import {CANDIDATE_VERSION,SLICES,getSliceState,narrativeFrame,progressAtAnchor,type SliceGeometry} from './scroll-contract';
import type {StorySceneController} from './story-scene';

const canvas=document.querySelector<HTMLCanvasElement>('#story-canvas')!,stage=document.querySelector<HTMLElement>('#visual-stage')!;
const status=document.querySelector<HTMLElement>('#status')!,poster=document.querySelector<HTMLElement>('#poster')!;
const motion=document.querySelector<HTMLButtonElement>('#motion')!;
const sections=[...document.querySelectorAll<HTMLElement>('section[data-slice]')];
const reducedQuery=matchMedia('(prefers-reduced-motion:reduce)'),desktopQuery=matchMedia('(min-width:1100px) and (min-height:700px)');
const params=new URLSearchParams(location.search),staticMode=params.get('mode')==='static',failureMode=params.get('mode')==='fallback';
let controller:StorySceneController|null=null,manualReduced=false,pending=false,geometries:SliceGeometry[]=[],progress=0,disposed=false,initializing=false,lastSlice='';
document.body.dataset.version=CANDIDATE_VERSION;
const reduced=()=>manualReduced||reducedQuery.matches;
function measure(){geometries=sections.map((section,index)=>{const rect=section.getBoundingClientRect(),start=rect.top+scrollY;return{id:SLICES[index].id,start,end:start+Math.max(rect.height,1)};});}
function update(){
 pending=false;if(disposed)return;
 progress=progressAtAnchor(geometries,scrollY+innerHeight*.5);
 const {slice,index,local,copyOpacity}=getSliceState(progress);
 document.body.dataset.scene=slice.chapter;document.body.dataset.slice=slice.id;document.body.dataset.routePhase=slice.route;
 if(slice.signal)document.body.dataset.signal=slice.signal;else delete document.body.dataset.signal;
 document.body.style.setProperty('--copy-opacity',String(reduced()?1:copyOpacity));
 document.body.dataset.sliceProgress=local.toFixed(5);document.body.dataset.storyProgress=progress.toFixed(6);
 sections.forEach(section=>section.classList.toggle('is-active',section.dataset.slice===slice.id));
 if(lastSlice!==slice.id){lastSlice=slice.id;document.querySelector('#slice-label')!.textContent=slice.label;document.querySelector('#slice-title')!.textContent=slice.title;document.querySelector('#slice-count')!.textContent=`${index+1} / ${SLICES.length}`;}
 controller?.setProgress(progress);
}
function schedule(){if(!pending&&!disposed){pending=true;requestAnimationFrame(update);}}
function updateMotion(){motion.setAttribute('aria-pressed',String(manualReduced));motion.textContent=manualReduced?'恢復動態':'減少動態';controller?.setReducedMotion(reduced());update();}
function fallback(message:string){controller?.dispose();controller=null;document.body.classList.add('is-fallback');document.body.dataset.renderMode=staticMode?'static':failureMode?'simulated-fallback':'fallback';poster.classList.remove('is-hidden');canvas.classList.remove('is-ready');status.textContent='靜態閱讀';status.title=message;}
async function initialize(){
 if(disposed||controller||initializing)return;
 if(!desktopQuery.matches){document.body.dataset.renderMode='text-only';status.textContent='桌機候選';return;}
 if(staticMode||failureMode){fallback(staticMode?'指定靜態模式':'模擬初始化失敗');return;}
 initializing=true;
 try{const {createStoryScene}=await import('./story-scene');if(disposed)return;
  const created=await createStoryScene({canvas,stage,reducedMotion:reduced(),scrollNarrative:narrativeFrame,onReady:()=>{},onFailure:fallback});
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
