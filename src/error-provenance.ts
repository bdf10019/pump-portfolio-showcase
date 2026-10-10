export function errorProvenance(input:{message?:string;filename?:string;stack?:string;lineno?:number;colno?:number},base:string){
 const message=input.message??'',stack=input.stack??'',filename=input.filename??'';
 const localPaths:string[]=[];
 for(const value of [filename,...(stack.match(/https?:\/\/[^\s)]+/g)??[])]){
  try{const url=new URL(value.replace(/:\d+:\d+$/,'')),origin=new URL(base).origin;
   if(url.origin===origin&&/^\/assets\/[\w-]+\.js$/.test(url.pathname))localPaths.push(url.pathname);
  }catch{/* 無法歸屬的來源不推論為產品或工具。 */}
 }
 return{mutationObserverTargetError:message.includes('MutationObserver')&&message.includes("not of type 'Node'"),localScriptPaths:[...new Set(localPaths)],anonymousFrame:stack.includes('<anonymous>'),sourceReported:!!filename,line:Number.isFinite(input.lineno)?input.lineno:null,column:Number.isFinite(input.colno)?input.colno:null};
}
