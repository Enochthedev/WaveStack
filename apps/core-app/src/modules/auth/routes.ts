import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';
import { getKeypair } from './keys';

type Mode = 'none' | 'hs256' | 'jwks';

export default async function authRoutes(app: FastifyInstance) {
  app.get('/validate', async (req, reply) => {
    const mode = (process.env.AUTH_MODE || 'none').toLowerCase() as Mode;

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (mode === 'none') return reply.code(200).send({ ok: true });
    if (!token) return reply.code(401).send({ error: 'missing token' });

    try {
      if (mode === 'hs256') {
        const secret = process.env.AUTH_JWT_SECRET;
        if (!secret) throw new Error('no secret');
        const verify = promisify((t: string, s: jwt.Secret, o: jwt.VerifyOptions, cb: jwt.VerifyCallback) =>
          jwt.verify(t, s, o, cb)
        );
        const decoded: any = await verify(token, secret, {
          algorithms: ['HS256'],
          audience: process.env.AUTH_AUDIENCE,
          issuer: process.env.AUTH_ISSUER,
        });
        const { sub, org_id } = decoded || {};
        const scopes = extractScopes(decoded);
        if (sub) reply.header('X-User-Id', String(sub));
        if (org_id) reply.header('X-Org-Id', String(org_id));
        if (scopes) reply.header('X-Scopes', scopes);
        return reply.code(200).send({ ok: true });
      }

      if (mode === 'jwks') {
        const jwksUrl = process.env.AUTH_JWKS_URL;
        if (!jwksUrl) throw new Error('no JWKS url');

        const client = jwksClient({ jwksUri: jwksUrl, cache: true, cacheMaxEntries: 5, cacheMaxAge: 10 * 60 * 1000 });
        const getKey = (header: any, cb: any) => {
          if (!header.kid) return cb(new Error('missing kid'));
          client.getSigningKey(header.kid, (err, key) => cb(err, key?.getPublicKey()));
        };
        const decoded: any = await new Promise((resolve, reject) => {
          (jwt as any).verify(
            token,
            getKey,
            { algorithms: ['RS256'], audience: process.env.AUTH_AUDIENCE, issuer: process.env.AUTH_ISSUER },
            (err: any, d: any) => (err ? reject(err) : resolve(d))
          );
        });
        const { sub, org_id } = decoded || {};
        const scopes = extractScopes(decoded);
        if (sub) reply.header('X-User-Id', String(sub));
        if (org_id) reply.header('X-Org-Id', String(org_id));
        if (scopes) reply.header('X-Scopes', scopes);
        return reply.code(200).send({ ok: true });
      }

      return reply.code(500).send({ error: 'bad mode' });
    } catch (e) {
      req.log.warn({ err: e }, 'auth failed');
      return reply.code(401).send({ error: 'invalid token' });
    }
  });

  // DEV client_credentials token endpoint at /api/auth/token
  app.post('/token', async (req, reply) => {
  const { client_id, client_secret, scope } = (req.body as any) || {};
  const clients = JSON.parse(process.env.SERVICE_CLIENTS_JSON || '[]');
  const client = clients.find((c: any) => c.client_id === client_id && c.client_secret === client_secret);
  if (!client) return reply.code(401).send({ error: 'invalid_client' });

  // normalize incoming/allowed scopes
  const requestedScopes: string[] =
    Array.isArray(scope) ? scope :
    typeof scope === 'string' ? scope.trim().split(/\s+/).filter(Boolean) :
    [];

  const allowedScopes: string[] =
    Array.isArray(client.scopes) ? client.scopes :
    typeof client.scopes === 'string' ? client.scopes.trim().split(/\s+/).filter(Boolean) :
    [];

  // if the request specified scopes, intersect with allowed; otherwise use all allowed
  const finalScopes = requestedScopes.length
    ? requestedScopes.filter(s => allowedScopes.includes(s))
    : allowedScopes;

  const scopeStr = finalScopes.join(' ');

  const { priv, kid } = await getKeypair();
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 900);

  const token = jwt.sign(
    {
      sub: client_id,
      org_id: client.org_id || 'org_default', // Include org_id from client config
      scope: scopeStr,                  // OIDC-style space-delimited
      iat: now,
      nbf: now - 5,
      aud: process.env.AUTH_AUDIENCE,
      iss: process.env.AUTH_ISSUER,
    },
    priv,
    { algorithm: 'RS256', expiresIn: ttl, keyid: kid }
  );

  return reply.send({ access_token: token, token_type: 'Bearer', expires_in: ttl });
  });
}

function extractScopes(decoded: any): string | undefined {
  const raw = decoded?.scopes || decoded?.scope || decoded?.scp || decoded?.permissions || decoded?.roles;
  if (!raw) return;
  if (Array.isArray(raw)) return raw.join(',');
  if (typeof raw === 'string') return raw.replace(/\s+/g, ',');
}
