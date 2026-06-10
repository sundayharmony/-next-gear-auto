import { CheckCircle, Clock, Wrench } from "lucide-react";

export function getStatusBadgeColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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
