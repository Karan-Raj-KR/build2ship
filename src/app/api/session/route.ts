import { getAccountUser } from '@/lib/auth/server';
export async function GET() {
  try {
    return Response.json({ user: await getAccountUser() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not verify the workspace session. Verify your email or sign in again.' }, { status: 401 });
  }
}
