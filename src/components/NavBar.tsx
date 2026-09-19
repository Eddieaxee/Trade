'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { IconName } from '@/components/Icon';

const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/strength', label: 'Currency Strength', icon: 'strength' },
  { href: '/smc', label: 'SMC', icon: 'smc' },
  { href: '/indicators', label: 'Indicators', icon: 'indicators' },
  { href: '/crt', label: 'CRT', icon: 'crt' },
  { href: '/news', label: 'News Room', icon: 'news' },
  { href: '/guide', label: 'Guide', icon: 'guide' }
];

/** Top navigation — the four analysis systems each get a dedicated page. */
export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={pathname === l.href ? 'active' : ''}
          data-active={pathname === l.href ? '1' : '0'}
        >
          <Icon name={l.icon} size={14} style={{ marginRight: 4, marginBottom: 1 }} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}