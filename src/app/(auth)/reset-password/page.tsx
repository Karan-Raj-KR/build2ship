'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function ResetPasswordPage() {
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const router = useRouter();
  return <main className="max-w-sm mx-auto py-16 space-y-4"><h1 className="page-title">Choose a new password</h1><form className="card p-5 space-y-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { if (password !== confirm) throw new Error('Passwords must match.'); const { authClient } = await import('@/lib/auth/client'); const { error } = await authClient.auth.updateUser({ password }); if (error) throw error; router.replace('/login'); } catch (error) { setError(error instanceof Error ? error.message : 'Could not change password.'); } finally { setBusy(false); } }}><label>New password<input className="input" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)}/></label><label>Confirm password<input className="input" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)}/></label><button className="btn btn-primary" disabled={busy}>Save password</button>{error && <p role="alert">{error}</p>}</form></main>;
}
