"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface NavbarProps {
  user: User;
}

const navLinks = [
  { href: "/dashboard", label: "Portfolio" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
];

export default function Navbar({ user }: NavbarProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      {/* Logo - Left */}
      <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-black">
        ABX
      </Link>

      {/* Nav Links - Center */}
      <div className="flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User Menu - Right */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
          {user.email?.split("@")[0]}
          <ChevronDown className="h-4 w-4" />
        </button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-muted-foreground hover:text-foreground hover:bg-neutral-100"
        >
          Sign out
        </Button>
      </div>
    </nav>
  );
}
