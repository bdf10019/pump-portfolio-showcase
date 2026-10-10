export const TEXT_REVEAL={duration:720,headingStep:85,bodyStep:45,maxSpread:1800} as const;
export const entryAction=(current:string,next:string,stable:boolean)=>current===next?'keep':stable?'settle':'replay';
export function splitGraphemes(text:string):string[]{
 const intl=Intl as typeof Intl & {Segmenter?:new(locale:string,options:{granularity:string})=>{segment:(text:string)=>Iterable<{segment:string}>}};
 return intl.Segmenter?[...new intl.Segmenter('zh-Hant',{granularity:'grapheme'}).segment(text)].map(s=>s.segment):Array.from(text);
}
export function revealDelays(count:number,heading:boolean){
 const n=Number.isFinite(count)?Math.max(0,Math.trunc(count)):0;
 const start=heading?180:650,step=Math.min(heading?TEXT_REVEAL.headingStep:TEXT_REVEAL.bodyStep,TEXT_REVEAL.maxSpread/Math.max(1,n-1));
 return Array.from({length:n},(_,i)=>start+i*step);
}
// 保留英文單字及中文避頭尾標點，避免逐字 span 導致錯誤換行。
export function wrapUnits(chars:readonly string[]):string[][]{
 const units:string[][]=[];
 for(let i=0;i<chars.length;i++){
  const unit=[chars[i]];
  if(/^[A-Za-z0-9]$/.test(chars[i]))while(i+1<chars.length&&/^[A-Za-z0-9]$/.test(chars[i+1]))unit.push(chars[++i]);
  if(/^[（《「『]$/.test(chars[i])&&i+1<chars.length)unit.push(chars[++i]);
  while(i+1<chars.length&&/^[，。；：？！、）》」』]$/.test(chars[i+1]))unit.push(chars[++i]);
  units.push(unit);
 }
 return units;
}
export function createTextReveal(sections:readonly HTMLElement[]){
 const groups=new Map<string,HTMLElement[]>(),restores:Array<()=>void>=[];
 let current='',stable=false,disposed=false;
 for(const section of sections){
  const targets=[...section.querySelectorAll<HTMLElement>('.slice-copy h1,.slice-copy h2,.slice-copy p,.work-number,.water-caption strong')];
  groups.set(section.id,targets);
  for(const element of targets){
   const original=[...element.childNodes],readable=document.createElement('span'),visual=document.createElement('span');
   const heading=/^H[12]$/.test(element.tagName),originalLabel=element.getAttribute('aria-label');
   readable.className='text-reveal-readable';for(const node of original)readable.append(node.cloneNode(true));
   visual.setAttribute('aria-hidden','true');
   const characters=splitGraphemes(element.textContent??''),delays=revealDelays(characters.length,/^H[12]$/.test(element.tagName));
   let index=0;
   function append(node:Node,parent:Node){
    if(node.nodeType===Node.TEXT_NODE){
     for(const unit of wrapUnits(splitGraphemes(node.textContent??''))){
      const holder=document.createElement('span');holder.className='text-reveal-unit';
      for(const char of unit){const glyph=document.createElement('span');glyph.className='text-reveal-glyph';glyph.textContent=char;glyph.style.setProperty('--letter-delay',`${delays[index++]}ms`);holder.append(glyph);}
      parent.appendChild(holder);
     }
    }else{const clone=node.cloneNode(false);parent.appendChild(clone);for(const child of node.childNodes)append(child,clone);}
   }
   for(const node of original)append(node,visual);
   if(heading){element.setAttribute('aria-label',original.map(node=>node.nodeName==='BR'?' ':node.textContent??'').join(''));element.replaceChildren(visual);}
   else element.replaceChildren(readable,visual);
   restores.push(()=>{element.replaceChildren(...original);if(originalLabel===null)element.removeAttribute('aria-label');else element.setAttribute('aria-label',originalLabel);element.classList.remove('text-reveal-active','text-reveal-complete');});
  }
 }
 function settle(id:string){for(const e of groups.get(id)??[]){e.classList.remove('text-reveal-active');e.classList.add('text-reveal-complete');}}
 return{
  setStable(value:boolean){if(disposed||value===stable)return;stable=value;if(stable)for(const id of groups.keys())settle(id);},
  enter(id:string){
   if(disposed||!groups.has(id))return;
   const action=entryAction(current,id,stable);if(action==='keep')return;
   if(current)settle(current);current=id;
   if(action==='settle'){settle(id);return;}
   for(const e of groups.get(id)??[]){e.classList.remove('text-reveal-complete');e.classList.add('text-reveal-active');}
  },
  dispose(){if(disposed)return;disposed=true;restores.forEach(restore=>restore());groups.clear();},
 };
}
