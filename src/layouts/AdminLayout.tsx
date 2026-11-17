import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  DatabaseZap,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchCurrentUser } from '../features/auth/authSlice';
import { AdminFooterLoginModal } from '../features/auth/AdminFooterLoginModal';
import { hasPermission, isStaffRole, type Permission } from '../lib/rbac';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopbar } from '../components/admin/AdminTopbar';

export function PermissionGuard({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { user } = useAppSelector((s) => s.auth);
  if (!user || !hasPermission(user.role, permission, user.customPermissions)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
        <h2 className="font-display mt-3 text-lg font-bold text-[#101B35] dark:text-white">Permission Required</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Your role (<span className="font-semibold">{user?.role || 'guest'}</span>) does not include{' '}
          <code className="font-mono-tabular rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs">{permission}</code>.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminLayout({ children, title }: { children: ReactNode; title?: string }) {
  const dispatch = useAppDispatch();
  const { user, initialized, authErrorCode } = useAppSelector((s) => s.auth);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FF] text-sm text-slate-500">
        Verifying staff session...
      </div>
    );
  }

  if (!user && authErrorCode === 'DATABASE_UNAVAILABLE') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FF] p-4">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <DatabaseZap className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-4 text-center text-xl font-bold text-[#101B35]">
            MongoDB Atlas Connection Required
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            NOVARA Admin requires an active MongoDB Atlas connection (<code className="font-mono-tabular text-xs bg-slate-100 px-1.5 py-0.5 rounded">MONGODB_URI</code>) to authenticate staff sessions and manage live store data.
          </p>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-[#101B35]">Environment Setup Checklist:</div>
            <p>1. Set <code className="font-mono-tabular">MONGODB_URI</code> and <code className="font-mono-tabular">JWT_SECRET</code> in your server environment.</p>
            <p>2. Optionally set <code className="font-mono-tabular">INITIAL_SUPER_ADMIN_EMAIL</code> and <code className="font-mono-tabular">INITIAL_SUPER_ADMIN_PASSWORD</code> for first-boot admin creation.</p>
            <p>3. Restart the server or click Retry Connection below once configured.</p>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => dispatch(fetchCurrentUser())}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#145CFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0E47D9]"
            >
              <RefreshCw className="h-4 w-4" /> Retry Connection
            </button>
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FF] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#E4EAF5] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#145CFF]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display mt-4 text-xl font-bold text-[#101B35]">NOVARA Commerce Admin</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Sign in with an authorized staff or administrator account to manage catalog, orders, marketing, and website settings.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="w-full rounded-xl bg-[#145CFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0E47D9]"
            >
              Sign In to Admin
            </button>
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Storefront
            </Link>
          </div>
        </div>
        <AdminFooterLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </div>
    );
  }

  if (!isStaffRole(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FF] p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-11 w-11 text-rose-600" />
          <h1 className="font-display mt-4 text-xl font-bold text-[#101B35]">Access Denied (403)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as <strong>{user.email}</strong> (Customer). Staff permissions are required for the admin portal.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7FF] dark:bg-[#071124] text-[#101B35] dark:text-slate-100 transition-colors">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={user} />
        <main className="flex-1 p-4 sm:p-6">
          {title && (
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="font-display text-xl font-bold text-[#101B35] dark:text-white">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
