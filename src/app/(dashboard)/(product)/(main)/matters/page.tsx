import { redirect } from "next/navigation";
/** Matters list is now merged into the Home page (/dashboard).
 *  This redirect ensures old links and bookmarks still work.
 *  SaaS NOTE: Keep this redirect in place for backwards compatibility. */
export default function MattersPage() {
  redirect("/dashboard");
}
