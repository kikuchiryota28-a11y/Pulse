import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  title = 'Nothing here yet.',
  description = 'There is still a lot of the world you have not discovered.',
  actionHref = '/explore',
  actionLabel = 'Discover something new →',
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[46vh] items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 h-px w-14 bg-white/15" />
        <h1 className="text-2xl font-medium tracking-[-0.03em] text-[#F5F5F5]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#71717A]">{description}</p>
        <Link
          href={actionHref}
          className="mt-7 inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-[#D4D4D8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
