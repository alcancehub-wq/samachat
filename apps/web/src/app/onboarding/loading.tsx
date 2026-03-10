export default function OnboardingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-6 shadow">
        <div className="h-6 w-40 animate-pulse rounded bg-muted/60" />
        <div className="mt-4 h-4 w-64 animate-pulse rounded bg-muted/40" />
        <div className="mt-8 grid gap-3">
          <div className="h-12 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-12 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
