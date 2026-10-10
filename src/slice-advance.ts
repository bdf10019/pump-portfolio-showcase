import type {SliceGeometry} from './intro-contract';
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
// 使用與活動片相同的中線切換點；首片起點是實際頁首，而非負半個視窗。
export function sliceAdvance(geometries:readonly SliceGeometry[],scroll:number,viewport:number){
 if(!geometries.length)return {index:0,amount:0,inFooter:false};
 const y=Number.isFinite(scroll)?Math.max(0,scroll):0,half=Number.isFinite(viewport)?Math.max(0,viewport)/2:0;
 let index=0;for(let i=1;i<geometries.length;i++){if(y<geometries[i].start-half)break;index=i;}
 const start=index===0?0:Math.max(0,geometries[index].start-half);
 const end=Math.max(start+1,(geometries[index+1]?.start??geometries[index].end)-half);
 return{index,amount:clamp((y-start)/(end-start)),inFooter:index===geometries.length-1&&y>=end};
}
