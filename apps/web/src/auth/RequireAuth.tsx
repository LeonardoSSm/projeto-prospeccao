import { type ReactNode, useEffect } from "react";
import { useAuth } from "react-oidc-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator && !auth.error) {
      void auth.signinRedirect();
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.activeNavigator, auth.error, auth]);

  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Carregando sessão...</div>;
  }

  if (auth.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-slate-600">
        <p>Falha na autenticação: {auth.error.message}</p>
        <button
          onClick={() => void auth.signinRedirect()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Redirecionando para login...</div>;
  }

  return <>{children}</>;
}
