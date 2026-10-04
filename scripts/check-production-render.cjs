const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname, '..');
const fact='Biddy Mason arrived in California in 1851.';
let searches=0;
process.chdir(root+'/web');
process.env.OPENAI_API_KEY='test-only';process.env.EXA_API_KEY='test-only';
global.fetch=async(input,options={})=>{
 const url=String(input);const body=options.body?JSON.parse(options.body):{};
 if(url.includes('/users/me'))return Response.json({id:'render-test'});
 if(url.includes('/users/render-test'))return Response.json({id:'render-test'});
 if(url.includes('/data/query/'))return Response.json({result:[]});
 if(url.includes('api.exa.ai')) { searches++; return Response.json({results:[{title:'Test archive',url:'https://example.org',highlights:[fact]}]}); }
 if(url.includes('api.openai.com')) {
  const isAudit=body.messages[0].content.includes('skeptical fact-checker');
  const input=JSON.parse(body.messages[1].content);
  const isFix=body.messages[0].content.includes('You are an editor');
  const result=isFix?{fact}:isAudit?{findings:[{part:fact,status:'supported',detail:'Test evidence.',sourceIndex:0,quote:fact}, ...(input.candidate.includes('It was the first') ? [{part:'It was the first in California.',status:'unsupported',detail:'No evidence supports first.'}] : [])]}:{caption:fact,cta:'What would you like to learn?'};
  return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
 }
 throw Error('Unexpected test request: '+url);
};
(async()=>{
 const trace=require(root+'/web/.next/server/app/api/post-generation/route.js.nft.json');
 assert.ok(trace.files.some(file=>file.endsWith('/@resvg/resvg-wasm/index_bg.wasm')), 'The deployment must include the rendering WASM file.');
 const route=require(root+'/web/.next/server/app/api/post-generation/route.js');
 await route.routeModule.ensureUserland();
 const post=(body)=>route.routeModule.userland.POST(new Request('http://localhost/api/post-generation',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify(body)}));
 const failed=await post({topic:fact,candidateClaim:`${fact} It was the first in California.`});
 const revision=await failed.json();assert.equal(failed.status,422,revision.error);
 assert.ok(revision.sourceContext);assert.equal(revision.suggestedCorrection,fact);
 const response=await post({topic:fact,candidateClaim:revision.suggestedCorrection,sourceContext:revision.sourceContext});
 const data=await response.json();assert.equal(response.status,200,data.error);
 assert.equal(searches,1,'Applying the correction must reuse the original evidence without another search.');
 const tampered=await post({topic:fact,candidateClaim:fact,sourceContext:revision.sourceContext+'changed'});
 assert.equal(tampered.status,400,'Fabricated source contexts must be rejected.');
 const png=Buffer.from(data.cardPng,'base64');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);
 console.log('Compiled correction flow reused its signed evidence and rendered a valid 1080 × 1080 PNG with mocked providers.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
