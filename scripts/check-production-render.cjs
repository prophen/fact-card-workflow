const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname, '..');
const fact='Biddy Mason arrived in California in 1851.';
process.chdir(root+'/web');
process.env.OPENAI_API_KEY='test-only';process.env.EXA_API_KEY='test-only';
global.fetch=async(input,options={})=>{
 const url=String(input);const body=options.body?JSON.parse(options.body):{};
 if(url.includes('/users/me'))return Response.json({id:'render-test'});
 if(url.includes('/users/render-test'))return Response.json({id:'render-test'});
 if(url.includes('/data/query/'))return Response.json({result:[]});
 if(url.includes('api.exa.ai'))return Response.json({results:[{title:'Test archive',url:'https://example.org',highlights:[fact]}]});
 if(url.includes('api.openai.com')) {
  const isAudit=body.messages[0].content.includes('skeptical fact-checker');
  const result=isAudit?{findings:[{part:fact,status:'supported',detail:'Test evidence.',sourceIndex:0,quote:fact}]}:{caption:fact,cta:'What would you like to learn?'};
  return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
 }
 throw Error('Unexpected test request: '+url);
};
(async()=>{
 const trace=require(root+'/web/.next/server/app/api/post-generation/route.js.nft.json');
 assert.ok(trace.files.some(file=>file.endsWith('/@resvg/resvg-wasm/index_bg.wasm')), 'The deployment must include the rendering WASM file.');
 const route=require(root+'/web/.next/server/app/api/post-generation/route.js');
 await route.routeModule.ensureUserland();
 const response=await route.routeModule.userland.POST(new Request('http://localhost/api/post-generation',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify({topic:fact,candidateClaim:fact})}));
 const data=await response.json();assert.equal(response.status,200,data.error);
 const png=Buffer.from(data.cardPng,'base64');assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);
 console.log('Compiled production endpoint rendered a valid 1080 × 1080 PNG with mocked providers.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
