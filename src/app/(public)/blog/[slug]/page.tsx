import { redirect } from "next/navigation";

// Old blog post URLs redirect to the Instagram feed page
export default function BlogPostRedirect() {
  redirect("/instagram");
}
