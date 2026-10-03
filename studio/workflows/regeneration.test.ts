import {createBench, subjectField} from '@sanity/workflow-engine-test'
import {expect, test} from 'vitest'
import {postWorkflow} from './postWorkflow'
import {renderCard} from '../../shared/render-card'
const editor = {kind: 'person' as const, id: 'geditor', roles: ['administrator']}
test('failed replacement stays in generating; retry and a second rejection require fresh work', async () => {
  const bench = createBench({documents: [{_id:'card', _type:'post', factText:'Fact', source:{citation:'Source',url:'https://example.org'},caption:'Question?',renderTemplate:'defaultFactCard',image:{asset:{_ref:'image-test-png'}}}]})
  await bench.deployDefinitions({definitions:[postWorkflow],expectedMinReaderModel:10})
  const {instance} = await bench.startInstance({definition:'post-workflow',initialFields:[subjectField('card',{type:'post'})]})
  const instanceId=instance._id
  await bench.fireAction({instanceId,activity:'generate',action:'submit'})
  await bench.fireAction({instanceId,activity:'review',action:'reject',actor:editor,params:{note:'Focus on the founding date'}})
  await bench.completePendingEffect({instanceId,effect:'regenerate-post',status:'failed',error:{message:'Provider unavailable'}})
  expect(await bench.currentStage(instanceId)).toBe('generating')
  await expect(bench.fireAction({instanceId,activity:'generate',action:'submit'})).rejects.toThrow()
  await bench.fireAction({instanceId,activity:'generate',action:'retry-regeneration',actor:editor})
  await bench.completePendingEffect({instanceId,effect:'retry-regenerate-post',status:'done'})
  expect(await bench.currentStage(instanceId)).toBe('inReview')
  await bench.fireAction({instanceId,activity:'review',action:'reject',actor:editor,params:{note:'Use a primary source'}})
  expect(await bench.currentStage(instanceId)).toBe('generating')
  const pending=await bench.findPendingEffects({instanceId})
  expect(pending.some(effect=>effect.name==='regenerate-post' && effect.params.revisionNote==='Use a primary source')).toBe(true)
})
test('renderer emits a 1080-square PNG and rejects unknown templates',async()=>{
  const png=await renderCard('Biddy Mason helped establish a church in Los Angeles.')
  expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(png.readUInt32BE(16)).toBe(1080)
  expect(png.readUInt32BE(20)).toBe(1080)
  await expect(renderCard('Fact','unknown')).rejects.toThrow('Unsupported')
})
