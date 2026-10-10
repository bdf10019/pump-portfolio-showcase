export const INTRO_DURATION=7;
export const LEGACY_DURATION=181/6;
export const DURATION=INTRO_DURATION+LEGACY_DURATION;
export const REEL_VERSION='0.3.0';
export const A_URL='http://127.0.0.1:4173/intro-candidate.html?v=0.4.0#intro';
export const HERO_DURATION=5;
export const ITEM_DURATIONS=[2,2,2,2,3,3,3,2] as const;
export const ITEM_STARTS=ITEM_DURATIONS.map((_,i)=>HERO_DURATION+ITEM_DURATIONS.slice(0,i).reduce<number>((sum,n)=>sum+n,0));
export const heroOpacity=(local:number,reduced=false)=>reduced?1:Math.min(1,Math.max(0,local/.3));
export const ITEMS=[
 {title:'水泵主角',subtitle:'EQ-PUMP-001 / 同一設備情境',detail:'一台循環水泵，說明三種工作。'},
 {title:'循環水路',subtitle:'供水 / 回水 / 方向示意',detail:'先看完整水路，再理解觀察訊號。'},
 {title:'振動觀察',subtitle:'感測來源 / 軸承待查',detail:'持續振動是待查線索，不是故障確診。'},
 {title:'溫度觀察',subtitle:'運轉條件 / 趨勢待查',detail:'溫度需與負載及歷史紀錄一起判讀。'},
 {title:'模型判讀',subtitle:'作品一 / AI 模型服務與 MLOps',detail:'保留判讀、評測與證據，讓人能複核。'},
 {title:'核准執行',subtitle:'作品二 / MCP 工具整合與授權治理',detail:'先檢查權限，再依人工核准執行。'},
 {title:'文件整理',subtitle:'作品三 / 多模態文件理解與人工複核',detail:'對照文件來源，修正後再匯出。'},
 {title:'證據留痕',subtitle:'三作品獨立 / 不控制真實設備',detail:'保留來源與歷史，不宣稱已自動串接。'}
] as const;
export type State={phase:'idle'|'playing'|'paused'|'ended';time:number};
export type Action={type:'play'|'pause'|'restart'|'hidden'}|{type:'tick';delta:number};
export function advance(state:State,action:Action):State{
 if(action.type==='restart')return{phase:'playing',time:0};
 if(action.type==='pause'||action.type==='hidden')return state.phase==='playing'?{...state,phase:'paused'}:state;
 if(action.type==='play')return state.phase==='ended'?state:{...state,phase:'playing'};
 if(action.type==='tick'&&state.phase==='playing'&&Number.isFinite(action.delta)&&action.delta>0){const time=Math.min(DURATION,state.time+action.delta);return{time,phase:time>=DURATION?'ended':'playing'};}
 return state;
}
export const canExplore=(s:State)=>s.phase==='ended'&&s.time===DURATION;
export function frameAt(input:number){
 const absolute=Number.isFinite(input)?Math.max(0,Math.min(DURATION,input)):0;
 if(absolute<INTRO_DURATION)return{mode:'assembly',item:-1,local:absolute,wire:false,showPump:true};
 const time=absolute-INTRO_DURATION;
 if(time<HERO_DURATION)return{mode:'hero',item:-1,local:time,wire:false,showPump:true};
 if(time<24){const item=ITEM_STARTS.findIndex((start,i)=>time>=start&&time<start+ITEM_DURATIONS[i]);return{mode:'index',item,local:time-ITEM_STARTS[item],wire:item===2||item===3,showPump:[0,2,3].includes(item)};}
 if(time<27)return{mode:'summary',item:-1,local:time-24,wire:false,showPump:false};
 return{mode:'end',item:-1,local:time-27,wire:false,showPump:true};
}
