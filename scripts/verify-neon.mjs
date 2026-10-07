// Run only against an isolated Neon QA branch and a preview using that branch.
// Email verification is deliberately simulated for reserved test identities;
// this validates sessions/RLS/persistence, not delivery to a real inbox.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
const base = process.env.QA_APP_URL || 'http://localhost:3000';
const sql = neon(process.env.NEON_DATABASE_URL);
assert(process.env.NEON_DATABASE_URL && process.env.QA_ALLOW_FIXTURES === 'true', 'Explicit QA fixture opt-in required');
assert(process.env.QA_EXPECTED_DATABASE_HOST && new URL(process.env.NEON_DATABASE_URL).hostname === process.env.QA_EXPECTED_DATABASE_HOST, 'Confirm the isolated QA endpoint before creating fixtures');
const suffix = crypto.randomUUID();
const identities = [], fixtureAccounts = [];
function agent() {
  const cookies = new Map();
  return async (path, body, method = body ? 'POST' : 'GET') => {
    const response = await fetch(`${base}${path}`, { method, redirect: 'manual', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(process.env.QA_PROTECTION_BYPASS ? { 'x-vercel-protection-bypass': process.env.QA_PROTECTION_BYPASS } : {}) }, body: body ? JSON.stringify(body) : undefined });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const index = pair.indexOf('='); cookies.set(pair.slice(0,index),pair.slice(index+1)); }
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text.slice(0,100); }
    return { status: response.status, data };
  };
}
async function signIn(number) {
  const request = agent();
  const email = `eligent-qa-${suffix}-${number}@example.invalid`, password = crypto.randomBytes(24).toString('hex');
  let legacyId;
  if (number === 1) {
    legacyId = crypto.randomUUID(); fixtureAccounts.push(legacyId);
    await sql`INSERT INTO accounts (id,email,legacy_email_verified) VALUES (${legacyId},${email},true)`;
    await sql`INSERT INTO profiles (id,display_name) VALUES (${legacyId},'Imported QA workspace')`;
  }
  const created = await request('/api/auth/sign-up/email', { email, password, name: 'Migration QA' });
  assert.equal(created.status, 200, `Signup failed: ${created.data?.message || created.status}`);
  const identity = (await sql`SELECT id FROM neon_auth."user" WHERE email = ${email}`)[0];
  assert(identity); identities.push(identity.id);
  const unverified = await request('/api/session');
  assert(!unverified.data.user, 'Unverified identity must not open a workspace');
  await sql`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = ${identity.id}`;
  const login = await request('/api/auth/sign-in/email', { email, password });
  assert.equal(login.status,200, `Login failed: ${login.data?.message || login.status}`);
  const session = await request('/api/session');
  assert.equal(session.status,200); assert(session.data.user?.id,'Missing workspace identity');
  if (legacyId) assert.equal(session.data.user.id,legacyId,'Verified identity failed to reclaim its imported workspace');
  const repeated = await request('/api/session');
  assert.equal(repeated.data.user.id,session.data.user.id, 'Workspace identity changed on repeat session lookup');
  const token = await request('/api/auth/token'); assert.equal(token.status,200); assert(token.data.token);
  return { request, userId: session.data.user.id, token: token.data.token };
}
async function rest(user, path, method = 'GET', body) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_NEON_DATA_API_URL}/${path}`, { method, headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json', Prefer:'return=representation' }, body: body ? JSON.stringify(body) : undefined });
  return { status:r.status, data:await r.json() };
}
let opportunityId;
try {
  assert.equal((await agent()('/api/profile')).status,401);
  const first = await signIn(1), second = await signIn(2);
  const reset = await first.request('/api/auth/email-otp/request-password-reset', { email: `eligent-qa-${suffix}-1@example.invalid` });
  assert.equal(reset.status,200,'Password-reset request endpoint failed');
  const invalidReset = await first.request('/api/auth/email-otp/reset-password', { email: `eligent-qa-${suffix}-1@example.invalid`, otp:'invalid-code', password:crypto.randomBytes(24).toString('hex') });
  assert(invalidReset.status >= 400 && invalidReset.status !== 404,'Reset endpoint must reject invalid codes');
  const patch = await first.request('/api/profile', { display_name: 'Neon persisted QA', country_of_residence:'India', onboarding_step:2 }, 'PATCH');
  assert.equal(patch.status,200,`Profile save failed: ${JSON.stringify(patch.data)}`);
  const saved = await first.request('/api/profile');
  assert.equal(saved.data.profile.display_name,'Neon persisted QA');
  const other = await rest(second,`profiles?id=eq.${first.userId}`); assert.deepEqual(other.data,[]);
  const forbidden = await rest(first,`profiles?id=eq.${first.userId}`,'PATCH',{role:'owner'}); assert(forbidden.status >= 400,'Admin self-promotion was accepted');
  assert((await rest(first,'accounts')).status >= 400, 'Private identity table exposed');
  assert((await rest(first,'progress_rewards','POST',{user_id:first.userId,event_key:'forged',xp:9000})).status >= 400,'Forged XP was accepted');
  assert((await rest(first,`profiles?id=eq.${first.userId}`,'DELETE')).status >= 400,'Client profile deletion was accepted');
  assert((await rest(first,'ai_usage','POST',{user_id:first.userId,usage_type:'analysis'})).status >= 400,'Client AI usage forgery was accepted');
  const reservations = await Promise.all(Array.from({length:5}, () => sql`SELECT reserve_ai_usage(${first.userId}::uuid,'analysis',1,1) AS id`));
  assert.equal(reservations.filter(rows => rows[0].id).length,1,'Concurrent reservations exceeded the AI allowance');
  const rows = await sql`INSERT INTO opportunities (title,status,publication_status,is_demo,source_label,source_status) VALUES ('Neon migration QA','published','published',false,'curated','unknown') RETURNING id`;
  opportunityId=rows[0].id;
  const app = await rest(first,'applications','POST',{user_id:first.userId,opportunity_id:opportunityId,stage:'saved'}); assert.equal(app.status,201,`Save failed: ${JSON.stringify(app.data)}`);
  const isolation = await rest(second,`applications?id=eq.${app.data[0].id}`); assert.deepEqual(isolation.data,[]);
  const preparation = await rest(first,'rpc/start_preparation','POST',{p_opportunity_id:opportunityId}); assert.equal(preparation.status,200,`Prepare failed: ${JSON.stringify(preparation.data)}`);
  const tasks = await rest(first,`application_tasks?application_id=eq.${app.data[0].id}`); assert.equal(tasks.data.length,3);
  assert.equal((await first.request('/api/applications/progress',{opportunity_id:opportunityId,action:'save'})).status,200);
  assert.equal((await first.request('/api/applications/progress',{opportunity_id:opportunityId,action:'unsave'})).status,409,'Active preparation must survive unsave');
  const taskUpdate = await first.request('/api/applications/progress',{task_id:tasks.data[0].id,completed:true},'PATCH');
  assert.equal(taskUpdate.status,200); assert.equal(taskUpdate.data.task.completed,true);
  assert.equal((await second.request('/api/applications/progress',{task_id:tasks.data[0].id,completed:true},'PATCH')).status,404,'Other-user checklist must stay private');
  const journey = await first.request('/api/journey'); assert.equal(journey.status,200); assert.equal(journey.data.applications.length,1);
  assert.equal((await second.request('/api/journey')).data.applications.length,0);
  const forgedProfile = await first.request('/api/profile',{role:'owner',is_suspended:false},'PATCH'); assert.equal(forgedProfile.status,200);
  assert.notEqual((await first.request('/api/profile')).data.profile.role,'owner');
  assert.equal((await first.request('/api/scout/query',{query:'AI',filters:{topics:'bad'}})).status,400);
  assert.equal((await first.request('/api/ask',{message:'Hello',history:'bad'})).status,400);
  const search = await first.request('/api/scout/saved',{query_text:'Find AI opportunities',notify_new_matches:false}); assert.equal(search.status,200);
  assert((await first.request('/api/scout/saved')).data.savedSearches.some(row=>row.id===search.data.savedSearch.id),'Saved search did not persist');
  assert.equal((await first.request(`/api/scout/saved?id=${search.data.savedSearch.id}`,undefined,'DELETE')).status,200);

  const reward = await rest(first,'progress_rewards'); assert.equal(reward.status,200); assert(reward.data.length>0);
  assert.equal((await first.request('/api/payments/create-order',{})).status,503);
  assert.equal((await first.request('/api/admin/users')).status,403);
  assert.equal((await first.request('/api/account')).status,200);
  const deletion = await first.request('/api/account',{confirmation:'DELETE'},'DELETE'); assert.equal(deletion.status,200,`Delete failed: ${JSON.stringify(deletion.data)}`);
  const afterDeletion = await first.request('/api/session'); assert(!afterDeletion.data.user, 'Deleted identity retained access');
  assert.equal((await sql`SELECT id FROM accounts WHERE id = ${first.userId}`).length,0);
  assert.equal((await second.request('/api/account',{confirmation:'DELETE'},'DELETE')).status,200);
  console.log('PASS: verified-session boundary, repeat login, profile persistence, other-user isolation, role/XP forgery denied, save/prepare, export/delete, checkout disabled.');
} finally {
  // Only the generated reserved identities created by this check are removed.
  for(const id of identities){await sql`DELETE FROM accounts WHERE neon_id = ${id}`;await sql`DELETE FROM neon_auth."user" WHERE id = ${id}`;}
  for (const id of fixtureAccounts) await sql`DELETE FROM accounts WHERE id = ${id}`;
  if(opportunityId) await sql`DELETE FROM opportunities WHERE id = ${opportunityId}`;
}
