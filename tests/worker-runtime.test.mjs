import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const runtimeRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=runtimeRequire('miniflare');

// Exercise the installed Worker tooling's real HTTP/D1 bridge after updating
// its exact-pinned network dependency. No live business data or external URLs.
test('Worker runtime preserves JSON requests, responses and D1 binding',async t=>{
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',d1Databases:['DB'],script:`export default {async fetch(request,env){
  const row=await env.DB.prepare('SELECT 42 AS answer').first();
  const input=request.method==='POST'?await request.json():null;
  return Response.json({answer:row.answer,input},{headers:{'X-Golf3D-Smoke':'ok'}});
 }}`});
 t.after(()=>mf.dispose());
 const get=await mf.dispatchFetch('https://golf3d.test/health');
 assert.equal(get.status,200);assert.equal(get.headers.get('X-Golf3D-Smoke'),'ok');
 assert.deepEqual(await get.json(),{answer:42,input:null});
 const post=await mf.dispatchFetch('https://golf3d.test/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:'Kiểm tra kết nối',amount:215500})});
 assert.deepEqual(await post.json(),{answer:42,input:{note:'Kiểm tra kết nối',amount:215500}});
});
