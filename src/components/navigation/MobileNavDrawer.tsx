import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import {
  sanitizeNavigationUrl,
  type NavigationMenuConfig,
} from '../../lib/navigationEngine';
import type { CategoryItem } from '../../types/commerce';
import { NavIcon } from './NavIcon';
import { MegaMenuSlider } from './MegaMenuSlider';

interface MobileNavDrawerProps {
  menus: NavigationMenuConfig[];
  categories: CategoryItem[];
  onClose: () => void;
}

export function MobileNavDrawer({ menus, categories, onClose }: MobileNavDrawerProps) {
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setExpandedMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      data-testid="mobile-nav-drawer"
      className="max-h-[calc(100vh-140px)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden"
    >
      {/* Dynamic Hierarchical Navigation Menus */}
      {menus.length > 0 && (
        <nav aria-label="Mobile Navigation" className="space-y-2">
          {menus.map((menu) => {
            const activeGroups = menu.groups.filter((g) => g.isActive && (g.items.length > 0 || Boolean(g.url)));
            const activeSlides = menu.settings.showSlider
              ? menu.slides.filter((s) => s.isActive && Boolean(s.imageUrl))
              : [];
            const activePromos = menu.settings.showPromotions
              ? menu.promotions.filter((p) => p.isActive && Boolean(p.title || p.imageUrl))
              : [];
            const hasExpandableContent =
              menu.type !== 'link' && (activeGroups.length > 0 || activeSlides.length > 0 || activePromos.length > 0);
            const isExpanded = expandedMenuId === menu.id;
            const safeUrl = sanitizeNavigationUrl(menu.url, '/shop');

            if (!hasExpandableContent) {
              return menu.openInNewTab ? (
                <a
                  key={menu.id}
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-[#F2F7FF] hover:text-[#1155EE]"
                >
                  <span className="flex items-center gap-2">
                    {menu.settings.showIcons && <NavIcon name={menu.icon} className="h-4 w-4 text-[#1155EE]" />}
                    <span>{menu.label}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </a>
              ) : (
                <Link
                  key={menu.id}
                  to={safeUrl}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-[#F2F7FF] hover:text-[#1155EE]"
                >
                  <span className="flex items-center gap-2">
                    {menu.settings.showIcons && <NavIcon name={menu.icon} className="h-4 w-4 text-[#1155EE]" />}
                    <span>{menu.label}</span>
                    {menu.badgeText && (
                      <span className="rounded bg-[#1155EE] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        {menu.badgeText}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              );
            }

            return (
              <div key={menu.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between bg-[#F8FAFF] pr-2">
                  <Link
                    to={safeUrl}
                    onClick={onClose}
                    className="flex flex-1 items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-[#0F1D3A]"
                  >
                    {menu.settings.showIcons && <NavIcon name={menu.icon} className="h-4 w-4 text-[#1155EE]" />}
                    <span>{menu.label}</span>
                    {menu.badgeText && (
                      <span className="rounded bg-[#1155EE] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        {menu.badgeText}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`Expand ${menu.label}`}
                    onClick={() => toggleMenu(menu.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-100/60 hover:text-[#1155EE]"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t border-slate-100 p-3.5">
                    {activeGroups.map((group) => (
                      <div key={group.id} className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {menu.settings.showIcons && <NavIcon name={group.icon} className="h-3.5 w-3.5 text-[#1155EE]" />}
                          <span>{group.title}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {group.items.map((item) => (
                            <Link
                              key={item.id}
                              to={sanitizeNavigationUrl(item.url, '/shop')}
                              onClick={onClose}
                              className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2 text-xs hover:border-blue-200 hover:bg-[#F4F7FE]"
                            >
                              {menu.settings.showIcons && item.visibilitySettings.showIcon && (
                                <NavIcon name={item.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1155EE]" />
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-[#0F1D3A]">{item.label}</span>
                                {menu.settings.showDescriptions &&
                                  item.visibilitySettings.showDescription &&
                                  item.description && (
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                      {item.description}
                                    </span>
                                  )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                    {activeSlides.length > 0 && (
                      <MegaMenuSlider
                        slides={activeSlides}
                        settings={menu.settings.sliderSettings}
                        onNavigate={onClose}
                        compact
                      />
                    )}

                    {activePromos.map((promo) => (
                      <Link
                        key={promo.id}
                        to={sanitizeNavigationUrl(promo.ctaUrl, '/shop')}
                        onClick={onClose}
                        className="block rounded-xl border border-blue-200 bg-[#EEF4FF] p-3"
                      >
                        <p className="text-xs font-bold text-[#0F1D3A]">{promo.title}</p>
                        {promo.subtitle && <p className="mt-0.5 text-[11px] text-slate-600">{promo.subtitle}</p>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Quick Utility & Top Categories */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-[#0F1D3A]">
        <Link to="/track-order" onClick={onClose} className="rounded-lg bg-slate-50 px-3 py-2">
          Track Order
        </Link>
        <Link to="/contact" onClick={onClose} className="rounded-lg bg-slate-50 px-3 py-2">
          Contact Support
        </Link>
        {categories.slice(0, 6).map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            onClick={onClose}
            className="truncate rounded-lg border border-slate-100 px-3 py-2 text-slate-700"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
