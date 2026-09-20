import { UserManager, WebStorageStateStore } from "oidc-client-ts";

// authority/client_id têm fallback para o Keycloak local (deploy/keycloak/
// prospector-realm.json) porque o modo dev do Vite roda sem variáveis de
// ambiente explícitas no container (ver compose.override.yaml) — em produção,
// VITE_OIDC_AUTHORITY/VITE_OIDC_CLIENT_ID vêm do build.
export const oidcSettings = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8081/realms/prospector",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "prospector-web",
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
};

// Instância única e compartilhada: react-oidc-context usa esta mesma
// UserManager para o ciclo de vida da sessão, e api/client.ts a importa
// diretamente para anexar o access_token em cada chamada — sem isso,
// precisaríamos duplicar a config ou passar o token por fora do React.
export const userManager = new UserManager(oidcSettings);
