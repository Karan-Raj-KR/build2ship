'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import ContributionSkeleton from '@/components/contributions/ContributionSkeleton';
import {RUNNER_COMMIT,TERMINAL_JOBS} from '@/lib/contribution-job-validation';
import '../mentor.css';
type Job={id:string;repo:string;number:number;title:string;status:string;legal:string[];signoff:boolean;pr_title:string;pr_body:string;pr_url?:string;error?:string;events?:{stage:string;text:string;at:string}[];result?:{summary:string;diff:string;files:string[];tests_run:string[];not_verified:string[]}};
async function request(body?:object,id?:string) {
  const response=await fetch('/api/contribution-jobs'+(id?'?id='+id:''),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.error || 'Job request failed.');return data;
}
export default function FullAutoPage() {
  const [repo,setRepo]=useState(''),[number,setNumber]=useState(0),[job,setJob]=useState<Job|null>(null),[jobs,setJobs]=useState<Job[]>([]);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[command,setCommand]=useState(''),[origin,setOrigin]=useState('');
  const [consent,setConsent]=useState(false),[maintainer,setMaintainer]=useState(false),[policy,setPolicy]=useState(false),[signoff,setSignoff]=useState(false),[understood,setUnderstood]=useState(false),[legal,setLegal]=useState(false);
  const [title,setTitle]=useState(''),[body,setBody]=useState('');
  useEffect(()=>{let active=true;const params=new URLSearchParams(window.location.search);
    Promise.all([request(),params.get('job')?request(undefined,params.get('job')!):Promise.resolve(null)]).then(([list,selected])=>{if(active){setOrigin(window.location.origin);setRepo(params.get('repo') || '');setNumber(Number(params.get('number')));setJobs(list);setJob(selected);setTitle(selected?.pr_title || '');setBody(selected?.pr_body || '');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const id=job?.id,status=job?.status;
  useEffect(()=>{if(!id || TERMINAL_JOBS.includes(status || ''))return;let active=true;
    // Poll sequentially; a slow request must not overwrite a newer response.
    let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const next=await request(undefined,id);if(active){setJob(next);setError('');if(next.status!==status){setTitle(next.pr_title || '');setBody(next.pr_body || '');setUnderstood(false);setLegal(false);}}}catch(e){if(active)setError(e instanceof Error?e.message:'Progress fetch failed.');}finally{if(active)timer=setTimeout(poll,3000);}};
    timer=setTimeout(poll,3000);return()=>{active=false;clearTimeout(timer);};},[id,status]);
  async function act(action:()=>Promise<void>) {setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{setBusy(false);}}
  function select(next:Job) {setJob(next);setTitle(next.pr_title || '');setBody(next.pr_body || '');setUnderstood(false);setLegal(false);setCommand('');setError('');window.history.replaceState(null,'','?job='+next.id);}
  if(loading)return <ContributionSkeleton/>;
  return <div className="mentor-surface min-h-screen bg-black text-white pb-16">
    <nav className="border-b border-white/10 px-6 py-4"><Link href="/contributions" className="text-sm font-bold text-zinc-300">← Contribution planner</Link></nav>
    <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header><p className="text-sky-200 font-bold mb-3">Separate feature · optional local runner</p><h1 className="text-5xl md:text-7xl">Full-auto <em className="text-sky-200">setup.</em></h1><p className="mt-5 text-zinc-300">Your runner prepares a change locally. You review the diff here before authorizing it to push to your fork and open a PR.</p></header>
      {error && <p role="alert" className="rounded-xl border border-red-400/40 p-4 text-red-200">{error}</p>}
      <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-4"><h2 className="text-3xl">Prepare your machine</h2><p className="text-zinc-300">Install Git, Python 3, GitHub CLI and Claude Code. Sign into <code>gh</code> and Claude Code with your own accounts. Local worker charges use your own Claude access; the app’s server key is never shared.</p><p className="text-amber-200">The runner forks before review and executes third-party builds/tests locally. Tool restrictions are not a security sandbox. Use a disposable VM. Approval authorizes commit, push and PR creation; cancellation cannot undo writes or forcibly stop a local process.</p>
        <details><summary className="cursor-pointer font-bold">Runner installation</summary><pre className="mt-4 overflow-auto rounded-xl bg-black p-4 text-sm whitespace-pre">{`mkdir oss-mentor\ncd oss-mentor\ncurl -fS '${origin}/full-auto/runner.py' -o runner.py\ncurl -fS '${origin}/full-auto/worker_prompt.md' -o worker_prompt.md\npython3 -m venv .venv\n.venv/bin/pip install httpx\ngh auth login\nclaude`}</pre><p className="mt-3 text-sm text-zinc-400">Setup instructions only; this app does not install or execute the runner. <a className="underline" href="/full-auto/runner.py" target="_blank" rel="noreferrer">Inspect the adapted runner</a>, based on <a className="underline" href={`https://github.com/havinash-007/moreee/blob/${RUNNER_COMMIT}/backend/runner.py`} target="_blank" rel="noreferrer">upstream {RUNNER_COMMIT.slice(0,7)}</a>. Publication stops if cancellation, expiry, another runner, or changed diff invalidates approval.</p></details>
      </section>
      {!job && <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-5"><h2 className="text-3xl">{repo && number ? `${repo} #${number}`:'Choose an issue in the contribution planner'}</h2><p className="text-zinc-300">Live checks cover open/unassigned status, up to 100 discussion and timeline records, and fetched README, root CONTRIBUTING and AGENTS guidance. Claim and AI-policy detection are conservative heuristics. Missing policies and external discussions remain unknown.</p>
        <label className="flex gap-3"><input type="checkbox" checked={maintainer} onChange={e=>setMaintainer(e.target.checked)}/>I have confirmed with the maintainer that I may work on this issue.</label>
        <label className="flex gap-3"><input type="checkbox" checked={policy} onChange={e=>setPolicy(e.target.checked)}/>I have checked all current contribution and AI policies and they permit this workflow.</label>
        <label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I authorize the local runner to fork, clone and run code. I am responsible for reviewing the change before approving publication.</label>
        <label className="flex gap-3"><input type="checkbox" checked={signoff} onChange={e=>setSignoff(e.target.checked)}/>Use my real local Git name/email for DCO sign-off, if required.</label>
        <button className="btn btn-primary" disabled={busy || !repo || !number || !maintainer || !policy || !consent} onClick={()=>void act(async()=>{const result=await request({action:'create',repo,number,consent,maintainerConfirmed:maintainer,policyConfirmed:policy,signoff});select(result.job);setCommand(`.venv/bin/python runner.py ${result.job.id} ${result.token} --server ${window.location.origin}`);setJobs(await request());})}>{busy?'Checking live sources…':'Create runner setup'}</button>
      </section>}
      {job && <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 space-y-5"><h2 className="text-3xl">{job.repo} #{job.number}</h2><p role="status" className="font-bold text-sky-200">{job.status} · {job.id}</p><p className="text-sm text-zinc-400">Job metadata and review persist in your Supabase account. Tokens expire after six hours and are displayed only at creation.</p>
        {command && <div><p className="mb-3">Run from the <code>oss-mentor</code> folder with the adapted runner above. Keep this job token private.</p><pre className="overflow-auto rounded-xl bg-black p-4 text-sm">{command}</pre><button className="mt-3 underline" onClick={()=>void act(()=>navigator.clipboard.writeText(command))}>Copy runner command</button></div>}
        {job.status==='ready' && !command && <p className="text-amber-200">The token is not recoverable after refresh. Use your saved command, or cancel this setup and create another.</p>}
        {job.legal?.length>0 && <p>Detected legal requirements: {job.legal.join(', ')}. Complete these yourself; detection may be incomplete.</p>}
        {job.events?.length ? <details open><summary>Runner-reported progress</summary><ol className="mt-3 max-h-64 overflow-auto text-sm space-y-2">{job.events.map((event,i)=><li key={i}><time>{new Date(event.at).toLocaleTimeString()}</time> · {event.text}</li>)}</ol></details>:<p className="text-zinc-400">No runner events received.</p>}
        {job.result?.summary && <p className="whitespace-pre-wrap">Runner report: {job.result.summary}</p>}
        {job.result?.diff && <details open><summary className="font-bold">Review the complete reported diff</summary><pre className="mt-4 max-h-96 overflow-auto bg-black p-4 text-sm whitespace-pre">{job.result.diff}</pre><p className="mt-3 text-sm">Reported tests: {job.result.tests_run.join('; ') || 'None reported'}. Not independently verified by this app.</p><p className="text-sm">Not verified: {job.result.not_verified.join('; ') || 'No additional gaps reported; this is not verification.'}</p></details>}
        {job.status==='review' && <form className="space-y-4" onSubmit={e=>{e.preventDefault();void act(async()=>{setJob(await request({action:'approve',id:job.id,pr_title:title,pr_body:body,understood,claConfirmed:legal,maintainerConfirmed:maintainer,policyConfirmed:policy}));});}}>
          <label className="label">PR title<input className="input" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="label">PR description in your own words<textarea className="input min-h-40" required minLength={20} maxLength={8000} value={body} onChange={e=>setBody(e.target.value)}/></label>
          <label className="flex gap-3"><input type="checkbox" checked={understood} onChange={e=>setUnderstood(e.target.checked)}/>I reviewed the complete diff, understand it, and checked the reported tests.</label>
          <label className="flex gap-3"><input type="checkbox" checked={legal} onChange={e=>setLegal(e.target.checked)}/>I completed applicable CLA/DCO requirements myself.</label>
          <label className="flex gap-3"><input type="checkbox" checked={maintainer} onChange={e=>setMaintainer(e.target.checked)}/>Maintainer agreement is still current.</label>
          <label className="flex gap-3"><input type="checkbox" checked={policy} onChange={e=>setPolicy(e.target.checked)}/>Current policies permit this AI-assisted contribution.</label>
          <button className="btn btn-primary" disabled={busy || !understood || !legal || !maintainer || !policy}>Approve runner to push and open PR</button>
        </form>}
        {job.pr_url && <a className="underline text-sky-200" href={job.pr_url} target="_blank" rel="noreferrer">View runner-reported pull request ↗</a>}
        {job.error && <p role="alert" className="text-amber-200">{job.error}</p>}
        {!TERMINAL_JOBS.includes(job.status) && job.status!=='opening' && <button className="btn btn-secondary" disabled={busy} onClick={()=>void act(async()=>setJob(await request({action:'cancel',id:job.id})))}>Cancel job authorization</button>}
        {TERMINAL_JOBS.includes(job.status) && <button className="btn btn-secondary" onClick={()=>{setJob(null);setCommand('');window.history.replaceState(null,'',window.location.pathname);}}>Back to setup</button>}
      </section>}
      <section className="space-y-4"><h2 className="text-3xl">Your setup history</h2>{!jobs.length?<p className="text-zinc-400">No setups yet.</p>:jobs.map(item=><button key={item.id} disabled={busy} className="block w-full text-left rounded-xl border border-white/10 p-4 hover:border-sky-400" onClick={()=>void act(async()=>select(await request(undefined,item.id)))}>{item.repo} #{item.number} · {item.status}</button>)}</section>
    </main>
  </div>;
}
