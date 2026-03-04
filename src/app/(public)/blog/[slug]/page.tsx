import { redirect } from "next/navigation";

// Old blog post URLs redirect to the new blog/social page
export default function BlogPostRedirect() {
  redirect("/blog");
}
