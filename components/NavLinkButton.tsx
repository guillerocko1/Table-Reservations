import Link from "next/link";
import type { ReactNode } from "react";

// Sits inside the dark NAV_BAR_CLASSNAME pill (below) on every page's
// header - one consistent solid-terracotta button style for every nav
// item (page links and the Special Notes action alike), so the whole
// app's navigation reads as one control.
export const navButtonClassName =
  "whitespace-nowrap rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]";

export const NAV_BAR_CLASSNAME = "flex flex-wrap items-center gap-3 rounded-full bg-[var(--color-nav-bg)] px-3 py-1.5";

interface NavLinkButtonProps {
  href: string;
  children: ReactNode;
}

export function NavLinkButton({ href, children }: NavLinkButtonProps) {
  return (
    <Link href={href} className={navButtonClassName}>
      {children}
    </Link>
  );
}
