import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {renderToPipeableStream} from 'react-server-dom-webpack/server.node';
import {createFromNodeStream} from 'react-server-dom-webpack/client.node';

// Exercise the real Flight transport changed by the security patch, including
// multiple typed arrays. This is compatibility coverage, not an exploit test.
test('Flight preserves booking values, Unicode and multiple typed arrays', async()=>{
 const model={booking:{room:'VIP 01',customer:'Khách thử Golf3D',amount:215500},first:new Uint8Array([0,127,255]),second:new Int32Array([-1,2026,215500]),note:'Phục vụ đúng đơn'};
 const stream=new PassThrough();const errors=[];
 const decoded=createFromNodeStream(stream,{moduleMap:{},serverModuleMap:{},moduleLoading:null});
 const renderer=renderToPipeableStream(model,{}, {onError:e=>errors.push(e)});renderer.pipe(stream);
 const result=await decoded;
 assert.deepEqual(errors,[]);assert.deepEqual(result.booking,model.booking);assert.equal(result.note,model.note);
 assert.ok(result.first instanceof Uint8Array);assert.ok(result.second instanceof Int32Array);
 assert.deepEqual([...result.first],[...model.first]);assert.deepEqual([...result.second],[...model.second]);
});
