import './scroll-story.css';
import {createStoryScene,type StorySceneController,type StoryFrame} from './story-scene';
import {narrativeFrame} from './scroll-contract';
const canvas=document.querySelector<HTMLCanvasElement>('#canvas')!,report=document.querySelector<HTMLElement>('#report')!;
const input=document.querySelector<HTMLInputElement>('#progress')!,reduced=document.querySelector<HTMLInputElement>('#reduced')!;
let controller:StorySceneController|null=null,initializing=false,sweeping=false,index=0,frames=0,totalFrames=0,maxCalls=0,maxTriangles=0,latest:StoryFrame|null=null;
const lifecycle:Array<{tracked:number;released:number;remaining:number}>=[];
const targets=[...Array.from({length:101},(_,i)=>i/100),...Array.from({length:100},(_,i)=>(99-i)/100)];
function display(){report.textContent=JSON.stringify({active:!!controller,initializing,sweeping,index,targets:targets.length,totalFrames,maxCalls,maxTriangles,latest,parts:narrativeFrame(Number(input.value),reduced.checked).parts,lifecycle,waterLabels:document.querySelectorAll('.water-labels').length,partLabels:document.querySelectorAll('.part-labels').length,canvas:{...canvas.dataset}},null,2);}
async function initialize(){if(controller||initializing)return;initializing=true;display();
 try{controller=await createStoryScene({canvas,stage:document.querySelector<HTMLElement>('#stage')!,reducedMotion:reduced.checked,scrollNarrative:narrativeFrame,onReady:()=>{},onFailure:message=>{report.textContent=message;},onFrame:frame=>{
  latest=frame;totalFrames++;maxCalls=Math.max(maxCalls,frame.calls);maxTriangles=Math.max(maxTriangles,frame.triangles);
  if(sweeping&&Math.abs(frame.progress-targets[index])<.000001&&++frames>=3){index++;frames=0;if(index===targets.length){sweeping=false;}else{input.value=String(targets[index]);controller?.setProgress(targets[index]);}}
  if(totalFrames%10===0)display();
 },onDispose:result=>lifecycle.push(result)});controller.setProgress(Number(input.value));
 }finally{initializing=false;display();}
}
input.addEventListener('input',()=>{sweeping=false;controller?.setProgress(Number(input.value));display();});
reduced.addEventListener('change',()=>{controller?.setReducedMotion(reduced.checked);display();});
document.querySelector('#sweep')!.addEventListener('click',()=>{if(!controller)return;index=0;frames=0;maxCalls=0;maxTriangles=0;sweeping=true;input.value='0';controller.setProgress(0);display();});
document.querySelector('#dispose')!.addEventListener('click',()=>{sweeping=false;controller?.dispose();controller=null;display();});
document.querySelector('#initialize')!.addEventListener('click',()=>void initialize());
window.addEventListener('resize',()=>controller?.resize());window.addEventListener('pagehide',()=>controller?.dispose());
void initialize();
