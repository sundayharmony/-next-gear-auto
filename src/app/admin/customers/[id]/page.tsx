import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> | { id: string } };

export default async function AdminCustomerByIdPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  if (!id) redirect("/admin/customers");
  redirect(`/admin/customers?highlight=${encodeURIComponent(id)}`);
}
