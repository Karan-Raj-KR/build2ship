import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Profile } from '@/types/database';

export function WorkspaceGuide({ profile, savedCount = 0 }: { profile?: Partial<Profile> | null; savedCount?: number }) {
  const missing = [!profile?.nationalities?.length && 'citizenship', !profile?.education_stage && 'education', !profile?.skills?.length && 'skills', !profile?.interests?.length && 'interests'].filter(Boolean);
  return <section className="workspace-guide" aria-label="Your next steps">
    <div className="workspace-guide-lead"><div><h2>{missing.length ? 'Make your next match more useful.' : savedCount ? 'Turn a saved possibility into a plan.' : 'Start with one opportunity.'}</h2><p>{missing.length ? `Add ${missing.join(', ')} to check more requirements. You can explore while your profile grows.` : savedCount ? 'Open your shortlist, check the official rules, then start a preparation checklist.' : 'Review why a listing fits, confirm its requirements, and save one worth your time.'}</p></div><Link className="btn btn-primary" href={missing.length ? '/profile' : savedCount ? '/saved' : '/for-you'}>{missing.length ? 'Improve my matches' : savedCount ? 'Open my shortlist' : 'Review my matches'}<ArrowRight size={16}/></Link></div>
    <ol className="workspace-guide-path">
      <li><Link href="/profile"><span>{!missing.length ? <CheckCircle2 size={18}/> : '1'}</span><div><strong>Add your background</strong><small>Profile facts help check eligibility.</small></div></Link></li>
      <li><Link href="/discover"><span>2</span><div><strong>Find and save a possibility</strong><small>Browse Discover or describe a goal in Scout.</small></div></Link></li>
      <li><Link href="/workspace"><span>3</span><div><strong>Prepare your application</strong><small>Follow a checklist, then apply with the provider.</small></div></Link></li>
    </ol>
  </section>;
}
