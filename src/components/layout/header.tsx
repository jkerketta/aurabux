"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-surface px-6">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-text-secondary">{user.email}</span>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
      >
        Sign Out
      </button>
    </header>
  );
}
