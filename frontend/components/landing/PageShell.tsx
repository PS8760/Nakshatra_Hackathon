// PageShell is now a passthrough — Navbar and Footer live in app/layout.tsx
// Kept for backwards compatibility with sub-pages that import it
export default function PageShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
