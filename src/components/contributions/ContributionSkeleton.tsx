export default function ContributionSkeleton() {
  return <div role="status" aria-busy="true" className="min-h-screen bg-black px-6 py-12 text-white">
    <span className="sr-only">Loading your open source experience…</span>
    <div aria-hidden="true" className="mx-auto max-w-6xl space-y-10 animate-pulse motion-reduce:animate-none">
      <div className="h-8 w-48 rounded bg-white/10"/>
      <div className="h-16 max-w-2xl rounded bg-white/10"/>
      <div className="h-5 max-w-xl rounded bg-white/10"/>
      <div className="rounded-3xl border border-white/10 p-8 space-y-6"><div className="h-8 w-56 rounded bg-white/10"/><div className="grid gap-6 sm:grid-cols-2">{[0,1,2,3].map(i => <div key={i} className="h-16 rounded bg-white/5"/>)}</div><div className="h-12 w-64 rounded-full bg-white/10"/></div>
      <div className="grid gap-6 lg:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-48 rounded-3xl border border-white/10 bg-white/5"/>)}</div>
    </div>
  </div>;
}
