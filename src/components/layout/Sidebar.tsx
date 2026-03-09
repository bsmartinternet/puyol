"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Send,
  Users,
  Megaphone,
  RefreshCw,
  BarChart2,
  LogOut,
  TrendingUp,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/sends", icon: Send, label: "Sends" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { href: "/reporting", icon: BarChart2, label: "Reporting" },
  { href: "/sync", icon: RefreshCw, label: "Sync" },
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-surface-1 border-r border-surface-2 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-surface-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600/20 rounded-lg border border-brand-600/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">MailOps</p>
            <p className="text-xs text-slate-500">v1.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group",
                active
                  ? "bg-brand-600/15 text-brand-300 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-surface-2"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 text-brand-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-surface-2 space-y-0.5">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-white truncate">
            {user?.name || "User"}
          </p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-2 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
