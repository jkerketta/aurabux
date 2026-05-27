"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, Users, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FriendsModal } from "@/components/friends/friends-modal";
import { motion } from "framer-motion";

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
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
      >
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/70 border border-white/30 rounded-full shadow-lg px-6 py-3.5">
          {/* Logo - Left */}
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-black">
            ABX
          </Link>

          {/* Nav Links - Center */}
          <div className="flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors relative $${
                    isActive
                      ? "text-black font-medium"
                      : "text-muted-foreground hover:text-black"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="navbar-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-black rounded-full"
                    />
                  )}
                </Link>
              );
            })}
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
        </div>
      </motion.nav>

      <FriendsModal open={friendsOpen} onOpenChange={setFriendsOpen} />
    </>
  );
}
