import { redirect } from "next/navigation";
import PublicShowcase from "@/components/PublicShowcase";
import { auth } from "@/lib/auth";

export default async function ShowcasePage() {
  const session = await auth();
  const isTeacher = session?.user?.role === "teacher" && !session.user.mustChangePassword;

  if (!isTeacher) {
    redirect("/showcase/play");
  }

  return <PublicShowcase session={session} />;
}
