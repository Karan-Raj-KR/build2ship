import { NextRequest,NextResponse } from 'next/server';
import { runnerAction,jobFailure } from '@/lib/contribution-jobs';
import { checkRateLimit } from '@/lib/api-auth';
import { createHash } from 'node:crypto';
const headers={'Cache-Control':'private, no-store'};
type Context={params:Promise<{id:string;action:string}>};
async function handle(request:NextRequest,context:Context) {
  const {id,action}=await context.params,token=request.headers.get('x-job-token') || '';
  if(!/^[0-9a-f-]{36}$/.test(id) || !/^jt_[\w-]{43}$/.test(token))return NextResponse.json({error:'Invalid job token or ID.'},{status:403,headers});
  if(!checkRateLimit('runner:'+createHash('sha256').update(token).digest('hex')).allowed)return NextResponse.json({error:'Too many runner requests.'},{status:429,headers});
  if((request.method==='GET')!==['spec','status'].includes(action))return NextResponse.json({error:'Unsupported method.'},{status:405,headers});
  try {
    let body={};
    if(request.method==='POST') {
      // Bound the stream before buffering; never truncate a review diff.
      const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
      if(reader) {while(true) {const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>400000){await reader.cancel();return NextResponse.json({error:'Report exceeds 400 KB. Reduce the change locally.'},{status:413,headers});}chunks.push(part.value);}}
      body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!body || typeof body!=='object' || Array.isArray(body))return NextResponse.json({error:'Send a report object.'},{status:400,headers});
    }
    return NextResponse.json(await runnerAction(id,token,action,body),{headers});
  } catch(error) {const failure=jobFailure(error);return NextResponse.json({error:failure.error},{status:failure.status,headers});}
}
export const GET=handle;
export const POST=handle;
