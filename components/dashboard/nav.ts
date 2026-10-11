import { BookOpen, CalendarCheck, LayoutDashboard, MessagesSquare } from "lucide-react";

export const NAV = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/knowledge", key: "knowledge", icon: BookOpen, exact: false },
  { href: "/dashboard/chat-test", key: "chatTester", icon: MessagesSquare, exact: false },
  { href: "/dashboard/bookings", key: "bookings", icon: CalendarCheck, exact: false },
] as const;
