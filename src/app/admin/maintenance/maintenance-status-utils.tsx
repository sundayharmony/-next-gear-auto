import { CheckCircle, Clock, Wrench } from "lucide-react";
import { getStatusColors } from "@/lib/design-system/status";

export function getStatusBadgeColor(status: string) {
  const colors = getStatusColors(status);
  return `${colors.bg} ${colors.text}`;
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 mr-1" />;
    case "in-progress":
      return <Wrench className="h-3 w-3 mr-1" />;
    case "completed":
      return <CheckCircle className="h-3 w-3 mr-1" />;
    default:
      return null;
  }
}

export function formatStatusLabel(status: string) {
  if (status === "in-progress") return "In Progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
