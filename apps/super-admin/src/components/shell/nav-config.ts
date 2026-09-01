import {
  LayoutDashboard,
  MapPin,
  Building2,
  Camera,
  ScanLine,
  ArrowLeftRight,
  CreditCard,
  Store,
  Users,
  Wallet,
  BarChart3,
  UserCog,
  Cpu,
  FileText,
  History,
  Settings,
  LifeBuoy,
  ListOrdered,
  Car,
  MessageSquare,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string | null; // null = not built yet, renders disabled
  icon: LucideIcon;
};

// design.md §5 — Super Admin sidebar, in spec order
export const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live Occupancy", href: null, icon: MapPin },
  { label: "Parking Spaces", href: "/dashboard/parking-spaces", icon: Building2 },
  { label: "Subscription Plans", href: "/dashboard/subscription-plans", icon: CreditCard },
  { label: "Marketplace", href: "/dashboard/marketplace", icon: Store },
  { label: "Camera Monitoring", href: null, icon: Camera },
  // Repointed to Marketplace's ANPR category page for now -- there's no separate
  // live camera/gate-monitoring console built yet. When a real ANPR Console
  // exists, either reclaim this href for it or add a "Configure vendor" link from
  // it back to /dashboard/marketplace/anpr.
  { label: "ANPR Console", href: "/dashboard/marketplace/anpr", icon: ScanLine },
  { label: "Entry & Exit Control", href: null, icon: ArrowLeftRight },
  { label: "Pass Management", href: null, icon: Ticket },
  { label: "Visitors", href: null, icon: Users },
  { label: "Payments", href: null, icon: Wallet },
  { label: "Analytics & BI", href: null, icon: BarChart3 },
  { label: "Users & Roles", href: null, icon: UserCog },
  { label: "Devices", href: null, icon: Cpu },
  { label: "Reports", href: null, icon: FileText },
  { label: "Audit Logs", href: null, icon: History },
  { label: "Settings", href: null, icon: Settings },
  { label: "Support", href: null, icon: LifeBuoy },
];

// Valet PRD Phase C — Parking Admin sidebar
export const parkingAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/parking-admin/dashboard", icon: LayoutDashboard },
  { label: "Live Queue", href: "/parking-admin/queue", icon: ListOrdered },
  { label: "Vehicles", href: "/parking-admin/vehicles", icon: Car },
  { label: "Valet Operators", href: "/parking-admin/operators", icon: Users },
  { label: "Reports", href: "/parking-admin/reports", icon: FileText },
  { label: "Communication", href: "/parking-admin/communication", icon: MessageSquare },
  { label: "Settings", href: "/parking-admin/configuration", icon: Settings },
];

// valet_operator sidebar — a restricted subset of parkingAdminNav. No account
// management or communication settings, both admin-only.
export const valetOperatorNav: NavItem[] = [
  { label: "Dashboard", href: "/parking-admin/dashboard", icon: LayoutDashboard },
  { label: "Live Queue", href: "/parking-admin/queue", icon: ListOrdered },
  { label: "Vehicles", href: "/parking-admin/vehicles", icon: Car },
];
