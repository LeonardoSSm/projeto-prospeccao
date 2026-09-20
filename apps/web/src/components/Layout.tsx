import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApiHealth } from "../api/client";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const health = useQuery({ queryKey: ["api-health"], queryFn: fetchApiHealth, retry: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-slate-900">Prospector</span>
            <nav className="flex gap-1">
              <NavLink to="/campaigns" className={navLinkClass}>
                Campanhas
              </NavLink>
              <NavLink to="/leads" className={navLinkClass}>
                Leads
              </NavLink>
            </nav>
          </div>
          <span
            className={`flex items-center gap-1.5 text-xs ${
              health.data?.status === "ok" ? "text-emerald-600" : "text-red-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                health.data?.status === "ok" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            API {health.isLoading ? "verificando..." : health.data?.status === "ok" ? "online" : "indisponível"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
