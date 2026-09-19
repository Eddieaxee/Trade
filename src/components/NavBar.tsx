'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon, { IconName } from '@/components/Icon';

const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/strength', label: 'Currency Strength', icon: 'strength' },
  { href: '/smc', label: 'SMC', icon: 'smc' },
  { href: '/indicators', label: 'Indicators', icon: 'indicators' },
  { href: '/crt', label: 'CRT', icon: 'crt' },
  { href: '/intel', label: 'Intel', icon: 'zap' },
  { href: '/news', label: 'News Room', icon: 'news' },
  { href: '/guide', label: 'Guide', icon: 'guide' }
];

/** Top navigation — desktop inline links, mobile hamburger drop-down. */
export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const link = (l: (typeof LINKS)[number]) => (
    <Link
      key={l.href}
      href={l.href}
      className={pathname === l.href ? 'active' : ''}
      data-active={pathname === l.href ? '1' : '0'}
      onClick={() => setOpen(false)}
    >
      <Icon name={l.icon} size={14} style={{ marginRight: 4, marginBottom: 1 }} />
      {l.label}
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <nav className="site-nav" aria-label="Main navigation">
        {LINKS.map(link)}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="nav-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={open ? 'close' : 'menu'} size={18} />
      </button>

      {open && (
        <>
          <div className="nav-backdrop" onClick={() => setOpen(false)} />
          <nav className="site-nav-mobile" aria-label="Mobile navigation">
            {LINKS.map(link)}
          </nav>
        </>
      )}
    </>
  );
}