type FiHeaderProps = {
  loading?: boolean;
};

const HeaderSkeleton = () => (
  <div className="space-y-3">
    <div className="h-9 w-64 bg-muted animate-pulse rounded" />
    <div className="h-4 w-96 bg-muted animate-pulse rounded" />
  </div>
);

export function FiHeader({ loading = false }: FiHeaderProps) {
  if (loading) return <HeaderSkeleton />;

  return (
    <div className="home-header mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
        Let's get started
      </h1>
      <p className="text-slate-600 text-lg">
        Welcome back! Here's an overview of your customer portfolio and quick actions.
      </p>
    </div>
  );
}

