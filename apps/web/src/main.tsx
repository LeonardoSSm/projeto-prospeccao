import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "react-oidc-context";
import { App } from "./App";
import { RequireAuth } from "./auth/RequireAuth";
import { userManager } from "./auth/oidcConfig";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider
      userManager={userManager}
      onSigninCallback={() => window.history.replaceState({}, document.title, window.location.pathname)}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RequireAuth>
            <App />
          </RequireAuth>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </React.StrictMode>,
);
