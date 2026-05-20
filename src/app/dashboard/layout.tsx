import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already handles auth redirects, but we need user for Navbar
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-5xl px-8 py-12">{children}</main>
    </div>
  );
}
