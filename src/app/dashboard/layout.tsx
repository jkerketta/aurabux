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

  if (!user) {
    return null;
  }

  // Fetch display_number from users table
  const { data: profile } = await supabase
    .from("users")
    .select("username, display_number")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        user={user}
        username={profile?.username ?? user.email?.split("@")[0] ?? "User"}
        displayNumber={profile?.display_number ?? ""}
      />
      <main className="mx-auto max-w-5xl px-8 pt-20 pb-12">{children}</main>
    </div>
  );
}
