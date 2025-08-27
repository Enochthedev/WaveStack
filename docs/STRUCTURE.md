# System Architecture

The system architecture consists of several key components that work together to provide a secure and efficient service. Below is a high-level overview of the architecture, followed by detailed diagrams illustrating the interactions between these components.

``` mermaid

    flowchart LR
  subgraph Client
    U["Browser / OBS / Bot"]
  end

  subgraph Core_Auth_Users_Profiles
    OIDC["Auth endpoints (OIDC/OAuth2)"]
    JWKS["/.well-known/jwks.json"]
  end

  subgraph Edge_Gateway
    WAF["WAF + Rate limiting"]
    VAL["JWT validate (RS256 + JWKS)"]
    MAP["Claims→Headers (X-User-Id, X-Scopes)"]
    AUD["Audit Logs"]
  end

  subgraph Mesh_Service_Mesh_mTLS
    POL["OPA/Policy (optional)"]
  end

  subgraph Svc_Internal_Services
    CoreAPI["Core API"]
    Clipper["Clipper"]
    Conn["Connector (Discord/Twitch/YouTube/..."]
    Uploader["Uploader (later)"]
  end

  subgraph Sec_Secrets
    Vault["(Vault/SOPS/SealedSecrets)"]
    Denylist["(Token denylist/Revoked JTIs)"]
  end

  U -->|Login| OIDC
  OIDC -->|Issue RS256 JWT| U
  U -->|HTTP w/ Bearer JWT| WAF
  WAF --> VAL --> MAP --> AUD
  MAP -->|mTLS| Mesh -->|mTLS| CoreAPI
  Mesh --> Clipper
  Mesh --> Conn
  Mesh --> Uploader
  VAL -->|pull keys| JWKS
  Edge_Gateway -->|rate-limit keys| Sec_Secrets
  Core_Auth_Users_Profiles --> Denylist
  Svc_Internal_Services -->|read secrets| Vault
```

``` mermaid
  sequenceDiagram
  participant User as Client
  participant Auth as Core Auth (OIDC)
  participant GW as Gateway (NGINX)
  participant JW as JWKS
  participant S1 as Clipper
  participant S2 as Connector

  User->>Auth: Login (OIDC/OAuth2)
  Auth-->>User: RS256 JWT (short-lived)
  User->>GW: API call with Bearer JWT
  GW->>JW: Fetch/refresh JWKS (cached)
  GW->>GW: Validate iss/aud/exp/nbf + signature
  GW->>GW: Rate limit + WAF
  GW->>GW: Map claims ➜ X-User-Id, X-Scopes, X-Request-Id
  GW->>S1: Forward over mTLS with headers
  S1-->>GW: 200 / result
  GW-->>User: Response + request-id
```
