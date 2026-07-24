"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, Users, LogOut, Menu, X, Award } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FriendsModal } from "@/components/friends/friends-modal";
import { AchievementsSheet } from "@/components/achievements/achievements-sheet";
import { motion, AnimatePresence } from "framer-motion";

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
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        {/* Main navbar bar */}
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/70 border border-white/30 rounded-full shadow-lg px-6 py-3.5">
          {/* Logo - Left */}
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-black">
            ABX
          </Link>

          {/* Desktop: Nav Links - Center */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors relative ${
                    isActive
                      ? "text-[#2563EB] font-medium"
                      : "text-[#4B5563] hover:text-[#2563EB]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="navbar-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop: User Menu - Right */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-[#4B5563] transition hover:text-[#2563EB]">
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
                <DropdownMenuItem onClick={() => setAchievementsOpen(true)}>
                  <Award className="mr-2 h-4 w-4" />
                  Achievements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Hamburger */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center h-8 w-8 text-[#4B5563] transition hover:text-[#2563EB]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile: Slide-down panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
              className="mt-2 backdrop-blur-xl bg-white/70 border border-white/30 rounded-2xl shadow-lg md:hidden overflow-hidden"
            >
              <div className="flex flex-col p-4 gap-1">
                {/* Nav Links */}
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "text-[#2563EB] bg-[#2563EB]/10"
                          : "text-[#4B5563] hover:text-[#2563EB] hover:bg-black/5"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                {/* Divider */}
                <div className="border-t border-black/10 my-2" />

                {/* User section */}
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-black">
                    {username}
                    {displayNumber && (
                      <span className="ml-1.5 text-xs text-neutral-400">#{displayNumber}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setFriendsOpen(true);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm text-[#4B5563] hover:text-[#2563EB] hover:bg-black/5 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Friends
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAchievementsOpen(true);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm text-[#4B5563] hover:text-[#2563EB] hover:bg-black/5 transition-colors"
                >
                  <Award className="h-4 w-4" />
                  Achievements
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <FriendsModal open={friendsOpen} onOpenChange={setFriendsOpen} />
      <AchievementsSheet open={achievementsOpen} onOpenChange={setAchievementsOpen} />
    </>
  );
}
