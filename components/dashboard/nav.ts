import { BookOpen, CalendarCheck, LayoutDashboard, MessagesSquare, Settings, ShieldCheck } from "lucide-react";

export const NAV = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/knowledge", key: "knowledge", icon: BookOpen, exact: false },
  { href: "/dashboard/chat-test", key: "chatTester", icon: MessagesSquare, exact: false },
  { href: "/dashboard/bookings", key: "bookings", icon: CalendarCheck, exact: false },
  { href: "/dashboard/settings", key: "settings", icon: Settings, exact: false },
  // Shown only to the operator (the page itself checks again on the server).
  { href: "/dashboard/admin", key: "admin", icon: ShieldCheck, exact: false, adminOnly: true },
] as const;
