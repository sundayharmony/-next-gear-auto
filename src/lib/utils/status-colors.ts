/** Centralized status badge colors for bookings across the admin panel */
export const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
};

/** Background colors for calendar/timeline blocks */
export const statusBgColors: Record<string, string> = {
  pending: "bg-yellow-100",
  confirmed: "bg-green-100",
  active: "bg-blue-100",
  completed: "bg-gray-100",
  cancelled: "bg-red-100",
  "no-show": "bg-orange-100",
};

/** Border colors for calendar/timeline blocks */
export const statusBorderColors: Record<string, string> = {
  pending: "border-yellow-400",
  confirmed: "border-green-400",
  active: "border-blue-400",
  completed: "border-gray-400",
  cancelled: "border-red-400",
  "no-show": "border-orange-400",
};
