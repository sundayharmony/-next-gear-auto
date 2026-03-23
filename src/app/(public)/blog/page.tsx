import { redirect } from "next/navigation";

// Blog route now redirects to Instagram feed page
export default function BlogRedirect() {
  redirect("/instagram");
}
