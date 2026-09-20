import { type ReactNode, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Radar, ShieldAlert } from "lucide-react";

function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen items-center justify-center">
      <div className="app-backdrop" />
      <div className="glass-panel scan-line flex flex-col items-center gap-4 px-10 py-9 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 shadow-[0_0_24px_rgba(34,211,238,0.4)]">
          <Radar className="h-6 w-6 animate-spin text-slate-950" style={{ animationDuration: "3s" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator && !auth.error) {
      void auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator, auth.error, auth]);

  if (auth.isLoading) {
    return (
      <AuthScreen>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Carregando sessão
        </p>
        <p className="text-xs text-slate-500">Verificando credenciais...</p>
      </AuthScreen>
    );
  }

  if (auth.error) {
    return (
      <div className="relative flex h-screen items-center justify-center">
        <div className="app-backdrop" />
        <div className="glass-panel flex flex-col items-center gap-4 px-10 py-9 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-rose-300">
            Falha na autenticação
          </p>
          <p className="max-w-xs text-xs text-slate-500">{auth.error.message}</p>
          <button
            onClick={() => void auth.signinRedirect()}
            className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.02]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthScreen>
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Redirecionando
        </p>
        <p className="text-xs text-slate-500">Levando você para o login...</p>
      </AuthScreen>
    );
  }

  return <>{children}</>;
}
