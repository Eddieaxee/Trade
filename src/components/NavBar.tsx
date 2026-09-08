'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/strength', label: 'Currency Strength' },
  { href: '/smc', label: 'SMC' },
  { href: '/indicators', label: 'Indicators' },
  { href: '/crt', label: 'CRT' }
];

/** Top navigation — the four analysis systems each get a dedicated page. */
export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Main navigation">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}