import Link from 'next/link';
import { Home, Compass, Plus, Bell, UserRound } from 'lucide-react';

export function PulseNav() {
  return (
    <nav className="pulse-global-nav" aria-label="Primary">
      <Link href="/" aria-label="Home"><Home size={17} /><span>HOME</span></Link>
      <Link href="/explore" aria-label="Explore"><Compass size={17} /><span>EXPLORE</span></Link>
      <Link className="create" href="/create" aria-label="Create"><Plus size={21} /></Link>
      <Link href="/activity" aria-label="Activity"><Bell size={17} /><span>ACTIVITY</span></Link>
      <Link href="/you" aria-label="You"><UserRound size={17} /><span>YOU</span></Link>
    </nav>
  );
}

export default function LayoutUI({ children }) {
  return <><div className="pulse-ui-shell">{children}</div><PulseNav /></>;
}
