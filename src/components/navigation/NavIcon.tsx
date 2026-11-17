import {
  Award,
  BookOpen,
  Camera,
  Cpu,
  Flame,
  Footprints,
  Gamepad2,
  Gift,
  Globe,
  Headphones,
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  Monitor,
  Package,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tablet,
  Tag,
  TrendingUp,
  Watch,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Home,
  Store,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Watch,
  Headphones,
  Camera,
  Gamepad2,
  Shirt,
  ShoppingBag,
  Footprints,
  BookOpen,
  Sparkles,
  Flame,
  Zap,
  Tag,
  ShieldCheck,
  Package,
  Cpu,
  LayoutGrid,
  Gift,
  Globe,
  Heart,
  Star,
  TrendingUp,
  Award,
};

export const NAV_ICON_OPTIONS = Object.keys(ICON_REGISTRY);

interface NavIconProps {
  name?: string | null;
  className?: string;
}

export function NavIcon({ name, className = 'h-4 w-4' }: NavIconProps) {
  if (!name) return null;
  const Icon = ICON_REGISTRY[name.trim()];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}
