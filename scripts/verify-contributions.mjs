// Disposable authenticated API QA; uses real GitHub and the configured AI provider.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {createServerClient}=require('@supabase/ssr');
const base = process.env.QA_APP_URL || 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(process.env.QA_ALLOW_FIXTURES, 'true', 'Set QA_ALLOW_FIXTURES=true for disposable QA accounts');
assert.equal(new URL(url).hostname.split('.')[0], process.env.QA_EXPECTED_SUPABASE_PROJECT, 'Confirm the target Supabase project');
assert.equal(new URL(process.env.SUPABASE_DB_URL).username, 'postgres.'+process.env.QA_EXPECTED_SUPABASE_PROJECT, 'Database must match the target project');
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const users = [];
async function account() {
  const email = `contribution-qa-${crypto.randomUUID()}@example.invalid`, password = crypto.randomBytes(24).toString('hex');
  const result = await admin.auth.admin.createUser({email,password,email_confirm:true});
  assert(!result.error, 'QA account creation failed');
  users.push(result.data.user.id);
  const cookies = new Map();
  const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:items=>items.forEach(c=>cookies.set(c.name,c.value))}});
  const login = await client.auth.signInWithPassword({email,password}); assert(!login.error,'QA sign-in failed');
  const request = async (path, body, method='POST') => {
    const response = await fetch(base+path,{method:body?method:'GET',headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),Origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    for(const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0], i=pair.indexOf('='); cookies.set(pair.slice(0,i),pair.slice(i+1)); }
    const text = await response.text(); let data;try { data=JSON.parse(text); } catch { data={html:text}; }
    return {status:response.status,data};
  };
  return {id:result.data.user.id,request};
}
try {
 const a=await account(), b=await account();
 const update=await a.request('/api/profile',{skills:['Python'],interests:['Research & science'],experience_summary:'One small Python project',time_availability:'5 hours per week',onboarding_completed:true},'PATCH');
 assert.equal(update.status,200,'Profile update failed');
 const loaded=await a.request('/api/contributions'); assert.equal(loaded.status,200); assert.deepEqual(loaded.data.profile.skills,['Python']);
 console.log('PASS Supabase sign-in and profile reuse');
 // Protocol fixture only: no worker, repository fork, commit, push or PR is executed.
 const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await db.connect();
 try {
  const jobId=crypto.randomUUID(),token='jt_'+crypto.randomBytes(32).toString('base64url');
  await db.query("INSERT INTO contribution_jobs(id,user_id,repo,number,title,token_hash) VALUES($1,$2,'eslint/eslint',42,'QA protocol fixture - not a live issue',$3)",[jobId,a.id,crypto.createHash('sha256').update(token).digest('hex')]);
  const runner=async(action,body,key=token)=>{const response=await fetch(`${base}/api/runner/${jobId}/${action}`,{method:body?'POST':'GET',headers:{'X-Job-Token':key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};};
  assert.equal((await b.request('/api/contribution-jobs?id='+jobId)).status,404);
  const restored=await a.request('/api/contribution-jobs?id='+jobId);assert.equal(restored.status,200);assert.equal(restored.data.token_hash,undefined);
  assert.equal((await runner('spec',undefined,'jt_'+crypto.randomBytes(32).toString('base64url'))).status,403);
  assert.equal((await runner('spec')).status,200);
  assert.equal((await runner('event',{stage:'opening',text:'Fixture'})).status,409);
  assert.equal((await runner('event',{stage:'working',text:'QA protocol fixture; no worker ran.'})).status,200);
  assert.equal((await runner('result',{status:'fixed',summary:'QA simulated report, not an executed worker',diff:'diff --git a/fixture b/fixture\n+fixture',pr_title:'QA fixture',pr_body:'QA fixture description - no real work.'})).status,200);
  assert.equal((await a.request('/api/contribution-jobs?id='+jobId)).data.status,'review');
  assert.equal((await a.request('/api/contribution-jobs',{action:'approve',id:jobId,pr_title:'QA',pr_body:'Fixture description long enough.'})).status,400);
  assert.equal((await runner('done',{pr_url:'https://github.com/eslint/eslint/pull/123'})).status,409);
  assert.equal((await a.request('/api/contribution-jobs',{action:'cancel',id:jobId})).status,200);
  assert.equal((await runner('result',{status:'fixed',diff:'fixture'})).status,410);
  assert.equal((await runner('status')).data.status,'cancelled');
  assert.equal((await a.request('/contributions/full-auto?job='+jobId)).status,200);
  console.log('PASS Supabase job refresh, account/token isolation, review gate, cancellation and runner protocol (fixture only)');
 } finally {await db.end();}
 const preferences={weeklyTime:'5 hours per week',preference:'tests'};
 const match=await a.request('/api/contributions',{action:'match',preferences}); assert.equal(match.status,200); assert.equal(match.data.matches[0].repo,'scikit-learn/scikit-learn');
 const repo=match.data.matches[0].repo;
 const issues=await a.request('/api/contributions?repo='+encodeURIComponent(repo)+'&preference=tests');
 if(issues.status!==200) {console.log('BLOCKED live GitHub read: HTTP '+issues.status); process.exitCode=1; } else {
   assert(issues.data.fetchedAt); console.log('PASS live GitHub read: '+issues.data.issues.length+' candidates');
   const issue=issues.data.issues[0];
   if(!issue) { console.log('BLOCKED: no live issue candidates to verify'); process.exitCode=1; }
   if(issue) {
     const generated=await a.request('/api/contributions',{action:'plan',repo,number:issue.number,preferences});
     if(generated.status!==200) {
       console.log('BLOCKED Anthropic plan: HTTP '+generated.status+' / '+(generated.data.code||'fetch_or_plan_error')); process.exitCode=1;
       assert.equal((await a.request('/api/contributions')).data.saved.length,0,'Failed AI must not save');
     } else {
       assert(generated.data.bundle.plan.question); console.log('PASS live Anthropic generated plan');
       const cross=await b.request('/api/contributions',{action:'save',token:generated.data.token});assert.equal(cross.status,400,'Another account must not save this token');
       const save=await a.request('/api/contributions',{action:'save',token:generated.data.token});assert.equal(save.status,200,'Save failed');
       const refresh=await a.request('/api/contributions'); const record=refresh.data.saved[0];assert(record);assert.equal(record.bundle.issue.number,issue.number);assert(record.tasks.length);
       const crossTask=await b.request('/api/applications/progress',{task_id:record.tasks[0].id,completed:true},'PATCH');assert.equal(crossTask.status,404);
       assert.equal((await a.request('/api/applications/progress',{task_id:record.tasks[0].id,completed:true},'PATCH')).status,200);
       const stage=await a.request('/api/contributions',{id:record.id,stage:'preparing'},'PATCH');assert.equal(stage.status,200);
       const final=await a.request('/api/contributions');assert.equal(final.data.saved[0].stage,'preparing');assert.equal(final.data.saved[0].tasks[0].completed,true);
       const duplicate=await a.request('/api/contributions',{action:'save',token:generated.data.token});assert.equal(duplicate.status,200);assert.equal(duplicate.data.created,false);
       assert.equal((await b.request('/api/contributions')).data.saved.length,0);
       console.log('PASS save, refresh, checklist, stage, duplicate preservation and account isolation');
     }
   }
 }
 const page=await a.request('/contributions');assert.equal(page.status,200);assert(page.data.html.includes('Loading your open source experience'));console.log('PASS authenticated contribution skeleton render');
} finally {
 const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL});await db.connect();
 try { for(const id of users) {
   await db.query('BEGIN');
   await db.query('DELETE FROM applications WHERE user_id=$1',[id]);
   await db.query("DELETE FROM opportunities WHERE created_by=$1 AND requirements ? 'elara_contribution'",[id]);
   await db.query('COMMIT');
   const removed=await admin.auth.admin.deleteUser(id);assert(!removed.error,'QA account cleanup failed');
 }} finally { await db.end(); }
 console.log('QA accounts and data removed');
}
