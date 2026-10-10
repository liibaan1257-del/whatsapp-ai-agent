import { BookOpen, CalendarCheck, LayoutDashboard, MessagesSquare } from "lucide-react";

export const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/knowledge", label: "Knowledge base", icon: BookOpen, exact: false },
  { href: "/dashboard/chat-test", label: "Chat tester", icon: MessagesSquare, exact: false },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck, exact: false },
] as const;
