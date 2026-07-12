import {
  LayoutDashboard,
  MapPin,
  Building2,
  Camera,
  ScanLine,
  ArrowLeftRight,
  CreditCard,
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
  { label: "Camera Monitoring", href: null, icon: Camera },
  { label: "ANPR Console", href: null, icon: ScanLine },
  { label: "Entry & Exit Control", href: null, icon: ArrowLeftRight },
  { label: "Pass Management", href: null, icon: CreditCard },
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
  { label: "Live Queue", href: null, icon: ListOrdered },
  { label: "Vehicles", href: null, icon: Car },
  { label: "Valet Operators", href: null, icon: Users },
  { label: "Reports", href: null, icon: FileText },
  { label: "Communication", href: null, icon: MessageSquare },
  { label: "Settings", href: null, icon: Settings },
];
