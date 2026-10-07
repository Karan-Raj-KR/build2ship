import {beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const mocks=vi.hoisted(()=>({sql:vi.fn(),context:vi.fn(),github:vi.fn()}));
vi.mock('@/lib/db/service',()=>({createSql:()=>mocks.sql}));
vi.mock('@/lib/contributions-server',()=>({fetchContributionContext:mocks.context,github:mocks.github,GitHubReadError:class extends Error {status=502;}}));
import {createJob,ownerAction,ownerJob,runnerAction} from '@/lib/contribution-jobs';
import {safeJobText,validateRunnerResult} from '@/lib/contribution-job-validation';
const id='00000000-0000-4000-8000-000000000001',token='jt_'+'a'.repeat(43);
let row:Record<string,unknown>;
beforeEach(()=>{
  vi.resetAllMocks();
  row={id,user_id:'user-a',repo:'eslint/eslint',number:42,title:'Issue',status:'running',token_hash:createHash('sha256').update(token).digest('hex'),legal:[],signoff:false};
  mocks.sql.mockImplementation(async(strings:TemplateStringsArray)=>strings.join(' ').startsWith('SELECT *')?[row]:[]);
  mocks.context.mockResolvedValue({issue:{title:'Issue'},sources:[{text:'Contribution guidance.'}]});
  mocks.github.mockResolvedValue([]);
});
it('bounds reports and rejects credentials without storing them',()=>{
  expect(validateRunnerResult({status:'fixed',diff:'diff --git a/x b/x',summary:'Changed x'}).files).toEqual([]);
  expect(()=>safeJobText('sk-ant-'+'a'.repeat(30),100)).toThrow('credentials');
  expect(()=>validateRunnerResult({status:'fixed',diff:'x'.repeat(300001)})).toThrow('length');
  expect(()=>validateRunnerResult({status:'fixed',files:Array(61).fill('a')})).toThrow('large');
});
it('never returns the runner hash or user identity to the browser',async()=>{
  const job=await ownerJob('user-a',id);expect(job.token_hash).toBeUndefined();expect(job.user_id).toBeUndefined();
  expect(mocks.sql.mock.calls[1][0].join(' ')).toContain('user_id=');
});
it('authenticates a runner only for the selected job',async()=>{
  await expect(runnerAction(id,'jt_'+'b'.repeat(43),'spec')).rejects.toThrow('Invalid');
  const spec=await runnerAction(id,token,'spec');expect(spec).toMatchObject({repo:'eslint/eslint',number:42});
  row.status='cancelled';await expect(runnerAction(id,token,'spec')).rejects.toThrow('no longer active');
  expect(await runnerAction(id,token,'status')).toMatchObject({status:'cancelled'});
});
it('blocks publication and approval without explicit review',async()=>{
  await expect(runnerAction(id,token,'event',{stage:'opening',text:'Push'})).rejects.toThrow('approval');
  await expect(ownerAction('user-a',id,{action:'approve'})).rejects.toThrow('awaiting review');
  row.status='review';await expect(ownerAction('user-a',id,{action:'approve',pr_title:'title',pr_body:'A valid detailed explanation.'})).rejects.toThrow('Confirm');
  expect(mocks.github).not.toHaveBeenCalled();
});
it('cannot report a PR in another repository or publish from an unapproved state',async()=>{
  await expect(runnerAction(id,token,'done',{pr_url:'https://github.com/evil/repo/pull/1'})).rejects.toThrow('selected repository');
  await expect(runnerAction(id,token,'done',{pr_url:'https://github.com/eslint/eslint/pull/1'})).rejects.toThrow('state changed');
  expect(mocks.sql.mock.calls.at(-1)![0].join(' ')).toContain("status IN ('approved','opening')");
});
it('requires consent and blocks policy restrictions and uncertain discussion before inserting',async()=>{
  await expect(createJob('user-a',{})).rejects.toThrow('Confirm');
  const input={repo:'eslint/eslint',number:42,consent:true,maintainerConfirmed:true,policyConfirmed:true};
  mocks.context.mockResolvedValueOnce({issue:{title:'Issue'},sources:[{text:'We do not accept AI-generated contributions.'}]});
  await expect(createJob('user-a',input)).rejects.toThrow('restrict AI');
  mocks.github.mockResolvedValueOnce(Array(100).fill({}));
  await expect(createJob('user-a',input)).rejects.toThrow('bounded check');
  expect(mocks.sql.mock.calls.every(([strings])=>!strings.join(' ').includes('INSERT'))).toBe(true);
});
