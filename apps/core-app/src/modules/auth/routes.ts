import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';

type Mode = 'none' | 'hs256' | 'jwks';

export default async function authRoutes(app: FastifyInstance) {
  app.get('/auth/validate', async (req, reply) => {
    const mode = (process.env.AUTH_MODE || 'none') as Mode;
    //make sure it's small letters
    
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

    if (mode === 'none') return reply.code(200).send({ ok: true });

    if (!token) return reply.code(401).send({ error: 'missing token' });

    try {
      if (mode === 'hs256') {
        const secret = process.env.AUTH_JWT_SECRET;
        if (!secret) throw new Error('no secret');
        const verify = promisify((token: string, secret: jwt.Secret, options: jwt.VerifyOptions, cb: jwt.VerifyCallback) => {
          jwt.verify(token, secret, options, cb);
        });
        await verify(token, secret, {
          algorithms: ['HS256'],
          audience: process.env.AUTH_AUDIENCE,
          issuer: process.env.AUTH_ISSUER,
        });
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
        const verifyWithKid = (t: string) =>
          new Promise((resolve, reject) => {
            (jwt as any).verify(t, getKey, {
              algorithms: ['RS256'],
              audience: process.env.AUTH_AUDIENCE,
              issuer: process.env.AUTH_ISSUER,
            }, (err: any, decoded: any) => (err ? reject(err) : resolve(decoded)));
          });
        await verifyWithKid(token);
        return reply.code(200).send({ ok: true });
      }

      return reply.code(500).send({ error: 'bad mode' });
    } catch (e) {
      req.log.warn({ err: e }, 'auth failed');
      return reply.code(401).send({ error: 'invalid token' });
    }
  });

  // Internal token guard example middleware (for service-to-service)
  app.addHook('preHandler', async (req, reply) => {
    // Only protect internal routes, skip public ones:
    if (!req.url.startsWith('/internal/')) return;

    const provided = req.headers['x-internal-token'];
    if (!provided || provided !== process.env.CORE_INTERNAL_TOKEN) {
      return reply.code(401).send({ error: 'internal token required' });
    }
  });
}