import 'server-only';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createSql } from '@/lib/db/service';
import { fetchContributionContext, github, GitHubReadError } from '@/lib/contributions-server';
import { safeJobText, TERMINAL_JOBS, validateRunnerResult } from '@/lib/contribution-job-validation';

export class JobError extends Error { constructor(message: string, public status = 400) { super(message); } }
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
async function expire() { await createSql()`UPDATE contribution_jobs SET status='expired',updated_at=now() WHERE expires_at<now() AND status NOT IN ('done','failed','cancelled','expired')`; }
function publicJob(row: Record<string, unknown>) { const { token_hash: _token, user_id: _user, ...job } = row; void _token; void _user; return job; }
export async function listJobs(user: string) {
  await expire();
  return (await createSql()`SELECT id,repo,number,title,status,created_at,updated_at,error,pr_url FROM contribution_jobs WHERE user_id=${user} ORDER BY created_at DESC LIMIT 20`);
}
export async function ownerJob(user: string, id: string) {
  await expire();
  const [job] = await createSql()`SELECT * FROM contribution_jobs WHERE id=${id}::uuid AND user_id=${user}`;
  if (!job) throw new JobError('Job not found.',404);
  return publicJob(job);
}
async function preflight(repo: string, number: number) {
  const context = await fetchContributionContext(repo, number);
  // Bounded checks are evidence, not a claim that an issue is free. Human confirmation is required as well.
  const [comments, timeline, agents] = await Promise.all([
    github(`/repos/${repo}/issues/${number}/comments?per_page=100`),
    github(`/repos/${repo}/issues/${number}/timeline?per_page=100`),
    github(`/repos/${repo}/contents/AGENTS.md`,true),
  ]);
  if (!Array.isArray(comments) || !Array.isArray(timeline) || comments.length >= 100 || timeline.length >= 100) throw new JobError('Discussion exceeds this bounded check. Use the contribution planner instead.',409);
  if (comments.some(c => /\b(i(?: am|'m|’m| will|’ll|'ll)?|working|claim|assigned|taking)\b.{0,40}\b(work|working|take|taking|claim|this|issue)\b/i.test(String(c.body || ''))) || timeline.some(e => e.event==='cross-referenced' && e.source?.issue?.pull_request)) throw new JobError('Discussion may contain a claim or linked PR. Resolve this with the maintainer; automated setup is blocked.',409);
  const texts = context.sources.map(s => s.text);
  if (agents?.encoding==='base64') texts.push(Buffer.from(agents.content,'base64').toString('utf8'));
  const text = texts.join('\n');
  if (/(?:no|not accept|do not|don't|prohibit|ban|reject|restrict).{0,100}(?:AI|LLM|generated|copilot)|(?:AI|LLM).{0,100}(?:not allowed|prohibited|banned|not accepted|discouraged)/i.test(text)) throw new JobError('Fetched guidance may restrict AI contributions. Full-auto is blocked; use the planner and ask the maintainer.',403);
  const legal = [...(/\bCLA\b|contributor license agreement/i.test(text) ? ['CLA'] : []), ...(/\bDCO\b|developer certificate of origin/i.test(text) ? ['DCO'] : [])];
  return { ...context, legal };
}
export async function createJob(user: string, input: Record<string, unknown>) {
  if (input.consent!==true || input.maintainerConfirmed!==true || input.policyConfirmed!==true) throw new JobError('Confirm local execution, maintainer agreement, and current AI/contribution policy first.');
  if (typeof input.repo!=='string' || !Number.isSafeInteger(input.number)) throw new JobError('Choose a curated issue.');
  await expire();
  const context = await preflight(input.repo, Number(input.number));
  if (context.legal.includes('DCO') && input.signoff!==true) throw new JobError('DCO sign-off requires your agreement and real local Git identity.');
  const token='jt_'+randomBytes(32).toString('base64url'), id=randomUUID();
  const rows=await createSql()`WITH lock_user AS (
    SELECT id FROM profiles WHERE id=${user} FOR UPDATE
  ) INSERT INTO contribution_jobs(id,user_id,repo,number,title,token_hash,signoff,legal)
    SELECT ${id}::uuid,id,${input.repo},${input.number},${context.issue.title},${hash(token)},${input.signoff===true},${JSON.stringify(context.legal)}::jsonb FROM lock_user
    WHERE (SELECT count(*) FROM contribution_jobs WHERE user_id=${user} AND created_at>now()-interval '24 hours')<3 RETURNING id`;
  if (!rows.length) throw new JobError('Daily limit reached: three setups per 24 hours.',429);
  return {job: await ownerJob(user,id),token};
}
export async function ownerAction(user:string,id:string,input:Record<string,unknown>) {
  const job=await ownerJob(user,id);
  if(input.action==='cancel') {
    if(job.status==='opening') throw new JobError('The runner has begun publishing. Stop it locally; cancellation cannot undo GitHub writes.',409);
    await createSql()`UPDATE contribution_jobs SET status='cancelled',updated_at=now() WHERE id=${id}::uuid AND user_id=${user} AND status IN ('ready','running','review','approved')`;
  } else if(input.action==='approve') {
    if(job.status!=='review') throw new JobError('This job is not awaiting review.',409);
    if(input.understood!==true || input.claConfirmed!==true || input.maintainerConfirmed!==true || input.policyConfirmed!==true) throw new JobError('Confirm understanding, legal requirements, maintainer agreement and current policy.');
    const title=safeJobText(input.pr_title,200).trim(),body=safeJobText(input.pr_body,8000).trim();
    if(!title || body.length<20) throw new JobError('Provide a title and a description of at least 20 characters.');
    const context=await preflight(String(job.repo),Number(job.number));
    if(context.legal.includes('DCO') && job.signoff!==true) throw new JobError('DCO guidance requires sign-off. Cancel and create a setup with sign-off enabled.');
    const rows=await createSql()`UPDATE contribution_jobs SET status='approved',pr_title=${title},pr_body=${body},updated_at=now() WHERE id=${id}::uuid AND user_id=${user} AND status='review' AND expires_at>now() RETURNING id`;
    if(!rows.length) throw new JobError('Job changed or expired. Refresh before approving.',409);
  } else throw new JobError('Choose approve or cancel.');
  return ownerJob(user,id);
}
export async function runnerAction(id:string,token:string,action:string,input:Record<string,unknown>={}) {
  await expire();
  const [job]=await createSql()`SELECT * FROM contribution_jobs WHERE id=${id}::uuid`;
  const actual=Buffer.from(hash(token)),expected=Buffer.from(job?.token_hash || '');
  if(!job || expected.length!==actual.length || !timingSafeEqual(expected,actual)) throw new JobError('Invalid job token.',403);
  if(action==='status') return {status:job.status,pr_title:job.pr_title,pr_body:job.pr_body,signoff:job.signoff,diff_hash:hash(job.result?.diff || '')};
  if(TERMINAL_JOBS.includes(job.status)) throw new JobError('Job is no longer active.',410);
  if(action==='spec') return {id,repo:job.repo,number:job.number,title:job.title,legal:job.legal,signoff:job.signoff,issue_url:`https://github.com/${job.repo}/issues/${job.number}`};
  let rows;
  if(action==='event') {
    const stage=safeJobText(input.stage,80),text=safeJobText(input.text,400);
    if(stage==='opening' && job.status!=='approved') throw new JobError('Publishing requires explicit approval.',409);
    rows=await createSql()`UPDATE contribution_jobs SET status=CASE WHEN status='ready' THEN 'running' WHEN status='approved' AND ${stage}='opening' THEN 'opening' ELSE status END,
      events=CASE WHEN jsonb_array_length(events)<500 THEN events || ${JSON.stringify([{stage,text,at:new Date().toISOString()}])}::jsonb ELSE events END,updated_at=now()
      WHERE id=${id}::uuid AND status IN ('ready','running','review','approved','opening') AND (${stage}<>'opening' OR status='approved') AND expires_at>now() RETURNING id`;
  } else if(action==='result') {
    const result=validateRunnerResult(input),title=safeJobText(input.pr_title || job.title,200),body=safeJobText(input.pr_body || '',8000);
    rows=await createSql()`UPDATE contribution_jobs SET status=${result.status==='fixed' && result.diff.trim() ? 'review':'failed'},result=${JSON.stringify(result)}::jsonb,pr_title=${title},pr_body=${body},updated_at=now() WHERE id=${id}::uuid AND status IN ('ready','running') AND expires_at>now() RETURNING id`;
  } else if(action==='done') {
    if(input.pr_url) {
      const url=safeJobText(input.pr_url,500),prefix=`https://github.com/${job.repo}/pull/`;
      if(!url.startsWith(prefix) || !/^\d+$/.test(url.slice(prefix.length))) throw new JobError('PR URL must belong to the selected repository.');
      rows=await createSql()`UPDATE contribution_jobs SET status='done',pr_url=${url},updated_at=now() WHERE id=${id}::uuid AND status IN ('approved','opening') AND expires_at>now() RETURNING id`;
    } else {
      const error=safeJobText(input.error || 'Runner reported a failure.',500);
      rows=await createSql()`UPDATE contribution_jobs SET status='failed',error=${error},updated_at=now() WHERE id=${id}::uuid AND status IN ('ready','running','review','approved','opening') AND expires_at>now() RETURNING id`;
    }
  } else throw new JobError('Unsupported runner action.',404);
  if(!rows?.length) throw new JobError('Job state changed or expired. Refresh.',409);
  return {ok:true};
}
export function jobFailure(error:unknown) {
  if(error instanceof JobError || error instanceof GitHubReadError) return {error:error.message,status:error.status};
  if(error instanceof Error && error.message.startsWith('Report')) return {error:error.message,status:422};
  if((error as {code?:string})?.code==='23505') return {error:'You already have an active job. Finish or cancel it first.',status:409};
  return {error:'Full-auto setup could not be completed. Retry later; no success is recorded.',status:503};
}
