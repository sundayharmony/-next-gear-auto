"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  Car,
  ShieldBan,
  Wrench,
  MapPin,
  DollarSign,
  Ticket,
  Users,
  Tag,
  Star,
  MessageSquare,
  ClipboardList,
  Megaphone,
  FileText,
  Bell,
} from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import type { PanelIconKey } from "@/lib/admin/panel-navigation";

/**
 * Single source of truth for staff panel nav icons (admin + manager layouts and bottom tab bars).
 * Keeps the `clipboard` key consistent (reports/analytics-style) across surfaces.
 */
export const staffPanelIconMap: Record<PanelIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendarDays: CalendarDays,
  calendar: Calendar,
  car: Car,
  shieldBan: ShieldBan,
  wrench: Wrench,
  mapPin: MapPin,
  dollarSign: DollarSign,
  ticket: Ticket,
  users: Users,
  tag: Tag,
  star: Star,
  messageSquare: MessageSquare,
  instagram: Instagram as LucideIcon,
  clipboard: ClipboardList,
  megaphone: Megaphone,
  fileText: FileText,
  bell: Bell,
};
