import {createStoryScene,type StoryFrame,type StorySceneController} from './story-scene';
const canvas=document.querySelector<HTMLCanvasElement>('#canvas')!;
const report=document.querySelector<HTMLElement>('#report')!;
let controller:StorySceneController|null=null,latest:StoryFrame|null=null;
let angle:{x:number;y:number}|null={x:0,y:0};
let targetIndex=0,framesAtTarget=0,sweeping=false,totalFrames=0,maxCalls=0,maxTriangles=0;
const targets=[...Array.from({length:21},(_,i)=>i/20),...Array.from({length:20},(_,i)=>(19-i)/20)];
const lifecycle:Array<{tracked:number;released:number;remaining:number}>=[];
function display(){report.textContent=JSON.stringify({active:!!controller,sweeping,targetIndex,totalFrames,maxCalls,maxTriangles,latest,lifecycle,labels:document.querySelectorAll('.water-labels').length},null,2);}
async function initialize(){
 if(controller)return;
 controller=await createStoryScene({canvas,stage:document.querySelector<HTMLElement>('#stage')!,reducedMotion:false,acceptancePointer:()=>angle,onReady:()=>{},onFailure:message=>{report.textContent=message;},onFrame:frame=>{
  latest=frame;totalFrames++;maxCalls=Math.max(maxCalls,frame.calls);maxTriangles=Math.max(maxTriangles,frame.triangles);
  if(sweeping&&Math.abs(frame.progress-targets[targetIndex])<.005){
   if(++framesAtTarget>=12){targetIndex++;framesAtTarget=0;if(targetIndex===targets.length){sweeping=false;controller?.setProgress(.6);}else controller?.setProgress(targets[targetIndex]);}
  }else framesAtTarget=0;
  if(totalFrames%15===0)display();
 },onDispose:result=>{lifecycle.push(result);}});
 controller.setProgress(.6);display();
}
document.querySelector('#sweep')!.addEventListener('click',()=>{if(!controller)return;targetIndex=0;framesAtTarget=0;sweeping=true;controller.setProgress(targets[0]);display();});
document.querySelector('#system')!.addEventListener('click',()=>{sweeping=false;angle={x:0,y:0};controller?.setProgress(.6);});
for(const [x,y] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
 const button=document.createElement('button');button.textContent=`${x*8}° / ${y*4}°`;button.addEventListener('click',()=>{sweeping=false;angle={x,y};controller?.setProgress(.6);});document.querySelector('#angles')!.append(button);
}
for(const [label,eventName] of [['模擬滑鼠離開事件','pointerleave'],['模擬視窗失焦事件','blur']]){
 const button=document.createElement('button');button.textContent=label;button.addEventListener('click',()=>{angle=null;(eventName==='blur'?window:document).dispatchEvent(new Event(eventName));});document.querySelector('#angles')!.append(button);
}
document.querySelector('#dispose')!.addEventListener('click',()=>{sweeping=false;controller?.dispose();controller=null;display();});
document.querySelector('#initialize')!.addEventListener('click',()=>void initialize());
window.addEventListener('resize',()=>controller?.resize());
window.addEventListener('pagehide',()=>controller?.dispose());
void initialize();
