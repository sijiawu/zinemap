import { redirect } from "next/navigation"

export default function StorePage() {
  // Redirect to home if no store ID is provided
  redirect("/")
}
