'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MarketSessions from '@/components/MarketSessions';
import NavBar from '@/components/NavBar';
import ThemeToggle from '@/components/ThemeToggle';
import Icon from '@/components/Icon';

/** Site header (brand + navigation + live session clocks + theme toggle).
 *  Hidden on the landing page (/) so the hero is uncluttered. */
export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <header className="app-header">
      <div className="brand">
        <Link href="/" style={{ color: 'inherit' }}>
          <Icon name="trending-up" size={20} style={{ marginRight: 4 }} />
          <span className="fx">FX</span> Pulse
        </Link>
        <span className="meta-tag">forex intelligence platform</span>
      </div>
      <NavBar />
      <div className="header-actions">
        <ThemeToggle />
        <MarketSessions />
      </div>
    </header>
  );
}
