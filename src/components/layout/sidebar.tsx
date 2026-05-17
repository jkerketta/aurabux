import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Portfolio" },
  { href: "/dashboard/search", label: "Search" },
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/spinner", label: "Spinner" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center border-b border-neutral-200 px-6">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-neutral-900">
          ABX
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
