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
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-neutral-500">{user.email}</span>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-lg px-4 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
      >
        Sign Out
      </button>
    </header>
  );
}
