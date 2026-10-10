import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resourceIdentity,summarizeResources,type ObservedResource} from '../src/network-audit-contract';
describe('本機資源觀測邊界',()=>{
 it.each(['http://127.0.0.1:4174/a.js','http://localhost:4174/a.js','http://[::1]:4174/a.js'])('辨識 loopback %s',url=>expect(resourceIdentity(url,url).loopback).toBe(true));
 it.each(['https://example.invalid/a','http://127.0.0.1.example.invalid/a','data:text/plain,hello'])('拒絕非 loopback %s',url=>expect(resourceIdentity(url,'http://127.0.0.1:4174').loopback).toBe(false));
 it('同源比較包含埠，不把另一服務當成候選',()=>expect(resourceIdentity('http://127.0.0.1:4177/a','http://127.0.0.1:4174').sameOrigin).toBe(false));
 it('不保存參數值、片段及帳密',()=>{const result=resourceIdentity('http://user:private@127.0.0.1:4174/a?token=private&v=3#private','http://127.0.0.1:4174');expect(result.queryKeys).toEqual(['token','v']);expect(result.credentials).toBe(true);expect(JSON.stringify(result)).not.toContain('private');expect(result.origin).toBe('http://127.0.0.1:4174');});
 it('非法網址不誤判通過',()=>expect(resourceIdentity('http://[bad','http://127.0.0.1:4174').loopback).toBe(false));
 it('未知 status 與 HTTP 失敗分開，不拿零值當成功',()=>{const rows=[0,200,404,null].map(status=>({identity:resourceIdentity('/x','http://127.0.0.1:4174'),type:'script',startMs:0,durationMs:1,transferBytes:0,status} satisfies ObservedResource));expect(summarizeResources(rows)).toMatchObject({count:4,httpFailures:1,statusUnavailable:2,external:0});});
 it('工程頁不接入公開敘事，不改模型與進度',()=>{const html=readFileSync('scroll-candidate.html','utf8'),source=readFileSync('src/scroll-network.ts','utf8');expect(html).not.toContain('scroll-network');expect(source).not.toContain('setProgress');expect(source).not.toContain('scrollTo');expect(source).toContain('errorsAfterIframeLoadOnly:true');expect(source).toContain('bufferOverflow:overflow');});
 it('頁面離開會停止輪詢與事件，自測不請求外部服務',()=>{const source=readFileSync('src/scroll-network.ts','utf8');expect(source).toContain('window.clearInterval(timer);stop()');expect(source).toContain("current.removeEventListener('error',failure,true)");expect(source).toContain("image.src='./assets/pump-core-v1/pump-core-parts-v1.json'");expect(source).toContain('image.remove()');});
});
