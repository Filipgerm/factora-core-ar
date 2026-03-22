export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-slate-50/80 dark:bg-background">{children}</div>
  );
}
