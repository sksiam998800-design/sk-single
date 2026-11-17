import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, breadcrumbs, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-[11.5px] font-medium text-[#64748B] dark:text-slate-400">
            <Link to="/admin/dashboard" className="hover:text-[#145CFF]">
              Dashboard
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-slate-400" />
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-[#145CFF]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#101B35] dark:text-slate-200 font-semibold">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#101B35] dark:text-white truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs sm:text-[13px] text-[#64748B] dark:text-slate-400">{subtitle}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
