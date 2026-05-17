"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  user: User;
}

const navLinks = [
  { href: "/dashboard", label: "Portfolio" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/spinner", label: "Spinner" },
];

export default function Navbar({ user }: NavbarProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-8">
      <Link href="/dashboard" className="text-xl font-bold tracking-tight text-black">
        ABX
      </Link>

      <div className="flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-neutral-500 transition hover:text-black"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-500">{user.email}</span>
        <button
          onClick={handleLogout}
          className="rounded-lg px-4 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
