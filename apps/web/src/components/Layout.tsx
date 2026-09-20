import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { Layers, LogOut, Radar, Rocket, Users2 } from "lucide-react";
import { fetchApiHealth } from "../api/client";

const NAV_ITEMS = [
  { to: "/campaigns", label: "Campanhas", icon: Rocket },
  { to: "/leads", label: "Leads", icon: Users2 },
  { to: "/niches", label: "Nichos", icon: Layers },
];

export function Layout() {
  const health = useQuery({ queryKey: ["api-health"], queryFn: fetchApiHealth, retry: false });
  const auth = useAuth();
  const online = health.data?.status === "ok";
  const email = auth.user?.profile.email ?? "";
  const initials = email.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="relative min-h-screen">
      <div className="app-backdrop" />
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#05070d]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                <Radar className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold tracking-wide text-white">
                PROSPECTOR<span className="text-cyan-400">.</span>
              </span>
            </div>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:px-3.5 ${
                      isActive
                        ? "bg-cyan-400/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_0_16px_rgba(34,211,238,0.15)]"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium sm:flex">
              <span
                className={`status-dot h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400 text-emerald-400" : "bg-rose-400 text-rose-400"}`}
              />
              <span className={`font-mono ${online ? "text-emerald-300" : "text-rose-300"}`}>
                {health.isLoading ? "VERIFICANDO" : online ? "SISTEMA ONLINE" : "OFFLINE"}
              </span>
            </div>
            {auth.isAuthenticated && (
              <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 font-mono text-[10px] font-bold text-slate-950">
                  {initials}
                </div>
                <span className="hidden max-w-[160px] truncate text-xs text-slate-300 md:inline">{email}</span>
                <button
                  onClick={() => void auth.signoutRedirect()}
                  title="Sair"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
