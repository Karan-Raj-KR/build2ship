export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-[var(--line)] border-t-[#285C48]`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader() {
  return <section className="workspace-skeleton" role="status" aria-label="Loading workspace content" aria-busy="true">
    <span className="sr-only">Loading your content. Navigation remains available.</span>
    <div className="skeleton-line skeleton-heading"/><div className="skeleton-line skeleton-subtitle"/>
    <div className="workspace-skeleton-grid">{[0,1,2,3].map(index => <div className="workspace-skeleton-panel" aria-hidden="true" key={index}><div className="skeleton-line skeleton-label"/><div className="skeleton-line skeleton-heading"/><div className="skeleton-line"/><div className="skeleton-line"/><div className="skeleton-line skeleton-subtitle"/><div className="skeleton-line skeleton-action"/></div>)}</div>
  </section>;
}
