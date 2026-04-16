import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> | { id: string } };

export default async function ManagerCustomerByIdPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  if (!id) redirect("/manager/customers");
  redirect(`/manager/customers?highlight=${encodeURIComponent(id)}`);
}
