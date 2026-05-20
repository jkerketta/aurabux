"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ChevronDown, Users, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FriendsModal } from "@/components/friends/friends-modal";

interface NavbarProps {
  user: User;
  username: string;
  displayNumber: string;
}

const navLinks = [
  { href: "/dashboard", label: "Portfolio" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
];

export default function Navbar({ user, username, displayNumber }: NavbarProps) {
  const [friendsOpen, setFriendsOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
            {username}
            {displayNumber && (
              <span className="text-xs text-neutral-400">({displayNumber})</span>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setFriendsOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Friends
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FriendsModal open={friendsOpen} onOpenChange={setFriendsOpen} />
    </nav>
  );
}
