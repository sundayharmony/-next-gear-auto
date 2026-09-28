import { redirect } from "next/navigation";

/** Invoices live under the Tickets & billing hub. */
export default function AdminInvoicesPage() {
  redirect("/admin/tickets?tab=invoices");
}
