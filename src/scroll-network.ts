import {resourceIdentity,summarizeResources,type ObservedResource} from './network-audit-contract';
import {errorProvenance} from './error-provenance';
const iframe=document.querySelector<HTMLIFrameElement>('#candidate')!,report=document.querySelector<HTMLElement>('#network-report')!,mode=document.querySelector<HTMLSelectElement>('#mode')!;
let child:Window|null=null,overflow=false,generation=0;
const rows=new Map<string,ObservedResource>(),errors:Array<{kind:string;resource:ReturnType<typeof resourceIdentity>|null}>=[];
let cleanups:Array<()=>void>=[];
const parentErrors:Array<ReturnType<typeof errorProvenance>>=[],pointerSamples:Array<{x:number;y:number;trusted:boolean;target:string}>=[];
const parentFailure=(event:ErrorEvent)=>{if(parentErrors.length<100)parentErrors.push(errorProvenance({message:event.message,filename:event.filename,stack:event.error instanceof Error?event.error.stack:'',lineno:event.lineno,colno:event.colno},location.href));else overflow=true;};
window.addEventListener('error',parentFailure);
function collect(entries:PerformanceEntry[],base:string){for(const entry of entries){if(!['resource','navigation'].includes(entry.entryType))continue;const key=`${entry.entryType}:${entry.name}:${entry.startTime}`;if(rows.size>=1000&&!rows.has(key)){overflow=true;continue;}
 const timing=entry as PerformanceResourceTiming;rows.set(key,{identity:resourceIdentity(entry.name,base),type:entry.entryType==='navigation'?'navigation':timing.initiatorType,startMs:entry.startTime,durationMs:entry.duration,transferBytes:timing.transferSize??0,status:'responseStatus' in timing?(timing as PerformanceResourceTiming&{responseStatus:number}).responseStatus:null});}}
function stop(){for(const cleanup of cleanups)cleanup();cleanups=[];child=null;}
function attach(){stop();rows.clear();errors.length=0;overflow=false;generation++;child=iframe.contentWindow;
 if(!child)return;const current=child,base=current.location.href,perf=current.performance;
 const bufferFull=()=>{overflow=true;};perf.addEventListener('resourcetimingbufferfull',bufferFull);cleanups.push(()=>perf.removeEventListener('resourcetimingbufferfull',bufferFull));
 const pointer=(event:PointerEvent)=>{if(pointerSamples.length===5)pointerSamples.shift();pointerSamples.push({x:event.clientX,y:event.clientY,trusted:event.isTrusted,target:(event.target as Element|null)?.tagName??'unknown'});};
 current.addEventListener('pointerdown',pointer,true);cleanups.push(()=>current.removeEventListener('pointerdown',pointer,true));pointerSamples.length=0;
 collect([...perf.getEntriesByType('navigation'),...perf.getEntriesByType('resource')],base);
 // 輪詢子頁面自己的標準 Performance Timeline，不能假設父頁的觀察器看見子頁載入。
 const failure=(event:Event)=>{if(errors.length>=100){overflow=true;return;}const element=event.target as HTMLImageElement|HTMLScriptElement|null;const url=element&&('src' in element)?element.src:null;errors.push({kind:event.target===current?'執行錯誤':'資源錯誤',resource:url?resourceIdentity(url,base):null});};
 const rejected=()=>{if(errors.length<100)errors.push({kind:'未處理的 Promise 拒絕',resource:null});else overflow=true;};
 current.addEventListener('error',failure,true);current.addEventListener('unhandledrejection',rejected);cleanups.push(()=>{current.removeEventListener('error',failure,true);current.removeEventListener('unhandledrejection',rejected);});render();
}
function render(){
 if(!child)return;
 try{
  collect([...child.performance.getEntriesByType('navigation'),...child.performance.getEntriesByType('resource')],child.location.href);
  const resources=[...rows.values()].sort((a,b)=>a.startMs-b.startMs),canvas=child.document.querySelector<HTMLCanvasElement>('#story-canvas');
  report.textContent=JSON.stringify({generation,summary:summarizeResources(resources),state:{slice:child.document.body.dataset.slice,renderMode:child.document.body.dataset.renderMode,progress:child.document.body.dataset.storyProgress,explode:canvas?.dataset.explode,pulse:canvas?.dataset.pulse},errors,parentErrors,pointerSamples,scope:'子頁面標準 Performance Timeline，非完整瀏覽器封包監測',samplingMs:500,bufferOverflow:overflow,errorsAfterIframeLoadOnly:true,resources,limitations:['iframe load 前的錯誤事件未攔截','失敗、取消、重導及瀏覽器擴充流量未保證完整','HTTP status=0 或缺少表示不可判定，不當成成功','URL 參數值、片段與錯誤訊息不保存','僅監看目前候選，不監看其他分頁或系統']},null,2);
 }catch{report.textContent='目前子頁無法同源讀取；本輪不宣稱資源觀測通過。';}
}
function restart(){stop();report.textContent='等待新候選載入；上一輪紀錄不作為本輪結果。';const next=new URL('./scroll-candidate.html',location.href);next.searchParams.set('v','0.3.8-candidate');if(mode.value!=='normal')next.searchParams.set('mode',mode.value);iframe.src=next.href;}
iframe.addEventListener('load',attach);mode.addEventListener('change',restart);document.querySelector('#reload')!.addEventListener('click',restart);const timer=window.setInterval(render,500);window.addEventListener('pagehide',()=>{window.clearInterval(timer);stop();window.removeEventListener('error',parentFailure);});
document.querySelector('#fault-check')!.addEventListener('click',()=>{if(!child)return;const image=child.document.createElement('img');image.hidden=true;image.alt='工程錯誤偵測自測';image.src='./assets/pump-core-v1/pump-core-parts-v1.json';image.addEventListener('error',()=>{image.remove();render();},{once:true});child.document.body.append(image);cleanups.push(()=>image.remove());});
if(iframe.contentDocument?.readyState==='complete'&&iframe.contentDocument.querySelector('#story-canvas'))attach();
