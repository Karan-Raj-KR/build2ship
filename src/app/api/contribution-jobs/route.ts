import { NextRequest,NextResponse } from 'next/server';
import { requireAuth,checkRateLimit } from '@/lib/api-auth';
import { createJob,listJobs,ownerJob,ownerAction,jobFailure } from '@/lib/contribution-jobs';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:NextRequest) {
  const auth=await requireAuth();if(auth.error)return auth.error;
  try {
    const id=request.nextUrl.searchParams.get('id');
    if(id && !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({error:'Invalid job ID.'},{status:400,headers});
    return NextResponse.json(id ? await ownerJob(auth.userId!,id) : await listJobs(auth.userId!),{headers});
  } catch(error) {const failure=jobFailure(error);return NextResponse.json({error:failure.error},{status:failure.status,headers});}
}
export async function POST(request:NextRequest) {
  const auth=await requireAuth();if(auth.error)return auth.error;
  if(request.headers.get('origin')!==request.nextUrl.origin) return NextResponse.json({error:'Use this app to manage jobs.'},{status:403,headers});
  if(!checkRateLimit(auth.userId!).allowed) return NextResponse.json({error:'Too many requests. Retry in a minute.'},{status:429,headers});
  try {
    const text=await request.text();if(text.length>12000)return NextResponse.json({error:'Request too large.'},{status:413,headers});
    const body=JSON.parse(text);
    if(!body || typeof body!=='object' || Array.isArray(body)) return NextResponse.json({error:'Send a job object.'},{status:400,headers});
    if(body.action==='create') return NextResponse.json(await createJob(auth.userId!,body),{headers});
    if(typeof body.id!=='string' || !/^[0-9a-f-]{36}$/.test(body.id)) return NextResponse.json({error:'Invalid job ID.'},{status:400,headers});
    return NextResponse.json(await ownerAction(auth.userId!,body.id,body),{headers});
  } catch(error) {const failure=jobFailure(error);return NextResponse.json({error:failure.error},{status:failure.status,headers});}
}
