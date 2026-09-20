import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import jwksClient, { type JwksClient } from "jwks-rsa";

export interface OidcClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

// Valida access tokens OIDC (RS256) contra o JWKS do provedor, sem sessão no
// servidor (docs/DOCUMENTATION.md seção 5.2). `issuer`/`audience` vêm de env
// porque o valor visto pelo navegador (host externo do IdP) e o endpoint que
// a própria API usa para buscar as chaves (host interno da rede Docker) não
// são necessariamente o mesmo — ver OIDC_ISSUER_URI vs OIDC_JWKS_URI no
// .env.example.
@Injectable()
export class JwtVerifierService {
  private readonly client: JwksClient;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private readonly config: ConfigService) {
    this.issuer = this.config.getOrThrow<string>("OIDC_ISSUER_URI");
    this.audience = this.config.getOrThrow<string>("OIDC_AUDIENCE");
    this.client = jwksClient({
      jwksUri: this.config.getOrThrow<string>("OIDC_JWKS_URI"),
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
    });
  }

  async verify(token: string): Promise<OidcClaims> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          if (!header.kid) {
            callback(new Error("Token sem 'kid' no header"));
            return;
          }
          this.client.getSigningKey(header.kid, (error, key) => {
            if (error || !key) {
              callback(error ?? new Error("Chave de assinatura não encontrada"));
              return;
            }
            callback(null, key.getPublicKey());
          });
        },
        { issuer: this.issuer, audience: this.audience, algorithms: ["RS256"] },
        (error, decoded) => {
          if (error || !decoded || typeof decoded === "string") {
            reject(error ?? new Error("Token inválido"));
            return;
          }
          resolve(decoded as OidcClaims);
        },
      );
    });
  }
}
