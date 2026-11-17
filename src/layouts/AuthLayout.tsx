import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface AuthLayoutProps {
  children?: ReactNode;
}

/**
 * Isolated full-viewport authentication layout.
 * Completely independent from StorefrontLayout — renders no storefront header,
 * top announcement bar, search bar, category navigation, popups, or footer.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6"
      style={{
        background:
          'linear-gradient(135deg, #DCEAFF 0%, #EEF4FF 38%, #F8FAFF 62%, #D7E7FF 86%, #74AAFF 115%)',
      }}
    >
      {/* Decorative Ambient Geometric Light Facets matching NOVARA Auth Design */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#B9D5FF]/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-8 h-96 w-96 rotate-12 rounded-[64px] bg-gradient-to-br from-[#3D82FF]/35 to-[#9CC2FF]/15 blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-96 -rotate-12 bg-gradient-to-tl from-[#1B64F2]/40 via-[#72A7FF]/20 to-transparent blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/3 -top-12 h-64 w-64 rotate-45 bg-gradient-to-b from-white/55 to-transparent blur-md"
      />

      <main className="relative z-10 flex w-full max-w-[1040px] items-center justify-center">
        {children || <Outlet />}
      </main>
    </div>
  );
}
