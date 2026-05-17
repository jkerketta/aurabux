import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Portfolio", icon: "📊" },
  { href: "/dashboard/search", label: "Search", icon: "🔍" },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/dashboard/spinner", label: "Spinner", icon: "🎰" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-white/5 bg-surface">
      <div className="flex h-16 items-center border-b border-white/5 px-6">
        <Link href="/dashboard" className="text-2xl font-bold text-primary">
          ABX
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
