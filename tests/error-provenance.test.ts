import {it,expect} from 'vitest';
import {errorProvenance} from '../src/error-provenance';
const base='http://127.0.0.1:4174/scroll-network.html';
it('只保留本機腳本位置，不保存訊息、參數、片段或原始堆疊',()=>{const result=errorProvenance({message:'私人內容',filename:'http://127.0.0.1:4174/assets/story-scene-demo.js?private=value#secret',stack:'at function (http://127.0.0.1:4174/assets/story-scene-demo.js?token=value:12:3)',lineno:12,colno:3},base);expect(result.localScriptPaths).toEqual(['/assets/story-scene-demo.js']);expect(JSON.stringify(result)).not.toMatch(/私人|private|secret|value|token/);});
it('匿名與未報來源不當成確認的產品或工具缺陷',()=>{const result=errorProvenance({message:"MutationObserver: parameter 1 is not of type 'Node'.",stack:'at <anonymous>:1:4'},base);expect(result).toMatchObject({mutationObserverTargetError:true,anonymousFrame:true,sourceReported:false,localScriptPaths:[]});});
it('其他來源與未知行號不冒充本機程式',()=>expect(errorProvenance({filename:'https://example.invalid/assets/secret.js',lineno:NaN,colno:Infinity},base)).toMatchObject({localScriptPaths:[],line:null,column:null}));
it('捕捉行號不接受非有限值，去除行列後保留同源檔名',()=>expect(errorProvenance({stack:'at fn (http://127.0.0.1:4174/assets/scroll-network-test.js:2:4)'},base).localScriptPaths).toEqual(['/assets/scroll-network-test.js']));
