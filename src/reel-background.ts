import {createMaterialSurface,type MaterialSurface,type LightPalette,type RGB} from './honeycomb-material';

export const BACKGROUND_SPEED_MULTIPLIER=1.5;
export const COLOR_INTERVAL_SECONDS=2;
export const COLOR_BLEND_SECONDS=.25;
const BLUE_WHITE:LightPalette={name:'blue-white',colors:[[215,240,255],[104,174,255],[30,95,220],[9,32,105]]};
const DEEP_BLUE:LightPalette={name:'deep-blue',colors:[[28,71,220],[16,42,170],[8,24,110],[3,10,55]]};
const validTime=(time:number)=>Number.isFinite(time)?Math.max(0,time):0;
export function bluePaletteAt(input:number):LightPalette{
 const time=validTime(input),segment=Math.floor(time/COLOR_INTERVAL_SECONDS),next=segment%2?DEEP_BLUE:BLUE_WHITE,previous=segment%2?BLUE_WHITE:DEEP_BLUE;
 const mix=segment===0?1:Math.min(1,(time%COLOR_INTERVAL_SECONDS)/COLOR_BLEND_SECONDS);
 const blend=(a:RGB,b:RGB):RGB=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*mix)) as [number,number,number];
 return{name:next.name,mix,colors:[blend(previous.colors[0],next.colors[0]),blend(previous.colors[1],next.colors[1]),blend(previous.colors[2],next.colors[2]),blend(previous.colors[3],next.colors[3])]};
}
// Independent elapsed time, driven by B's existing RAF, not its film controls.
export const backgroundTime=(elapsed:number,reduced:boolean)=>reduced?0:validTime(elapsed);
export function advanceBackgroundTime(elapsed:number,delta:number,blocked:boolean){return !blocked&&Number.isFinite(delta)&&delta>0?validTime(elapsed)+delta:validTime(elapsed);}
export type ReelBackground={render(elapsed:number,reduced:boolean):void;resize():void;dispose():void};
export function createReelBackground(canvas:HTMLCanvasElement):ReelBackground{
 let surface:MaterialSurface|null=null,lastTime:number|null=null,disposed=false;
 try{surface=createMaterialSurface(canvas,{speedMultiplier:BACKGROUND_SPEED_MULTIPLIER,palette:bluePaletteAt});canvas.dataset.materialStatus='ready';}
 catch{canvas.hidden=true;canvas.dataset.materialStatus='fallback';}
 return{
  render(elapsed,reduced){if(disposed||!surface)return;const time=backgroundTime(elapsed,reduced);if(time===lastTime)return;lastTime=time;surface.render(time,false);},
  resize(){if(disposed)return;surface?.resize();lastTime=null;},
  dispose(){if(disposed)return;disposed=true;surface?.dispose();surface=null;}
 };
}
