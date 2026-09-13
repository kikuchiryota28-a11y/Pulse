import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#08080A] text-[#F5F5F5]">
      <EmptyState
        title="This discovery moved on."
        description="The page you were looking for is no longer here."
        actionHref="/"
        actionLabel="Return to Discover →"
      />
    </main>
  );
}
