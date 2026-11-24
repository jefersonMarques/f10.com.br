export function supportTabClass(panel: string | null, currentPanel: string | null): string {
  const base = "inline-flex h-full shrink-0 items-center gap-1.5 border-b-2 px-1 text-[12px] font-semibold transition-colors";
  return currentPanel === panel
    ? `${base} border-[var(--app-primary)] text-[var(--app-primary)]`
    : `${base} border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-primary)]`;
}
