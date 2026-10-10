import * as T from 'three';

// The entire central machine remains opaque; only outboard pipes use this curve.
export const FADE_STOPS = [12.5, 15, 19, 22] as const;
export function pipeOpacity(x:number){
 const d=Math.abs(x),smooth=(a:number,b:number)=>{const t=T.MathUtils.clamp((d-a)/(b-a),0,1);return t*t*(3-2*t);};
 return (1-.45*smooth(12.5,15))*(1-(1-.15/.55)*smooth(15,19))*(1-smooth(19,22));
}
export function createSurfaceTexture(){
 const size=128,data=new Uint8Array(size*size*4);let seed=271828;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const v=228+Math.round((seed/4294967295)*18+5*Math.sin(x*.8));
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;
 map.repeat.set(4,4);map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
 return map;
}
export function fadeMaterial(source:T.MeshStandardMaterial){
 const material=source.clone(),enabled={value:1};
 material.name=`${source.name}／外延淡化`;material.transparent=true;material.depthWrite=false;material.side=T.FrontSide;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uWaterFade=enabled;
  shader.vertexShader='varying float vPipeDistance;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPipeDistance = abs(position.x);');
  shader.fragmentShader='uniform float uWaterFade;\nvarying float vPipeDistance;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float pipeAlpha=(1.0-.45*smoothstep(12.5,15.0,vPipeDistance))
    *(1.0-(1.0-.15/.55)*smoothstep(15.0,19.0,vPipeDistance))
    *(1.0-smoothstep(19.0,22.0,vPipeDistance));
   diffuseColor.a *= mix(1.0,pipeAlpha,uWaterFade);`);
 };
 material.customProgramCacheKey=()=> 'water-outboard-fade-v1';
 return {material,setEnabled(value:boolean){enabled.value=value?1:0;}};
}
