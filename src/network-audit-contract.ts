export type ResourceIdentity={path:string;origin:string;loopback:boolean;sameOrigin:boolean;queryKeys:string[];credentials:boolean};
/** 僅保留路徑、來源與參數名稱，不匯出參數值、片段或帳密。 */
export function resourceIdentity(name:string,base:string):ResourceIdentity{
 try{const url=new URL(name,base),source=new URL(base);return{path:url.pathname,origin:url.origin,loopback:['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&['http:','https:'].includes(url.protocol),sameOrigin:url.origin===source.origin,queryKeys:[...new Set(url.searchParams.keys())].sort(),credentials:!!(url.username||url.password)};}
 catch{return{path:'[無效網址]',origin:'[無效]',loopback:false,sameOrigin:false,queryKeys:[],credentials:false};}
}
export type ObservedResource={identity:ResourceIdentity;type:string;startMs:number;durationMs:number;transferBytes:number;status:number|null};
export function summarizeResources(rows:ObservedResource[]){return{count:rows.length,external:rows.filter(row=>!row.identity.loopback).length,crossOrigin:rows.filter(row=>!row.identity.sameOrigin).length,credentialURLs:rows.filter(row=>row.identity.credentials).length,httpFailures:rows.filter(row=>row.status!==null&&row.status>=400).length,statusUnavailable:rows.filter(row=>row.status===null||row.status===0).length};}
