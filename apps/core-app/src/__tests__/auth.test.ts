/**
 * Auth module tests
 * Tests JWT generation, validation, and key management
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getKeypair } from '../modules/auth/keys';
import jwt from 'jsonwebtoken';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('Auth Module - Key Management', () => {
  it('should generate ephemeral keypair when AUTH_KEYS_DIR is not set', async () => {
    delete process.env.AUTH_KEYS_DIR;

    const pair = await getKeypair();

    expect(pair).toBeDefined();
    expect(pair.kid).toBeDefined();
    expect(pair.priv).toContain('BEGIN RSA PRIVATE KEY');
    expect(pair.pub).toContain('BEGIN RSA PUBLIC KEY');
    expect(pair.jwk).toBeDefined();
    expect(pair.jwk.alg).toBe('RS256');
    expect(pair.jwk.kty).toBe('RSA');
  });

  it('should generate and persist keypair when AUTH_KEYS_DIR is set', async () => {
    const testKeysDir = join(tmpdir(), `wavestack-test-keys-${Date.now()}`);
    process.env.AUTH_KEYS_DIR = testKeysDir;

    // First call should generate and save
    const pair1 = await getKeypair();
    expect(pair1).toBeDefined();
    expect(existsSync(join(testKeysDir, 'jwt-private.pem'))).toBe(true);
    expect(existsSync(join(testKeysDir, 'jwt-public.pem'))).toBe(true);

    // Cleanup
    rmSync(testKeysDir, { recursive: true, force: true });
    delete process.env.AUTH_KEYS_DIR;
  });

  it('should create valid JWT tokens that can be verified', async () => {
    const pair = await getKeypair();

    const token = jwt.sign(
      {
        sub: 'test-user',
        org_id: 'org_test',
        scope: 'read write',
      },
      pair.priv,
      {
        algorithm: 'RS256',
        expiresIn: '1h',
        keyid: pair.kid,
        audience: 'wavestack-test',
        issuer: 'wavestack-test',
      }
    );

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Verify the token
    const decoded = jwt.verify(token, pair.pub, {
      algorithms: ['RS256'],
      audience: 'wavestack-test',
      issuer: 'wavestack-test',
    }) as any;

    expect(decoded.sub).toBe('test-user');
    expect(decoded.org_id).toBe('org_test');
    expect(decoded.scope).toBe('read write');
  });
});

describe('Auth Module - JWT Claims', () => {
  it('should include org_id in JWT claims', async () => {
    const pair = await getKeypair();

    const token = jwt.sign(
      {
        sub: 'client-123',
        org_id: 'org_demo',
        scope: 'clip:create clip:read',
      },
      pair.priv,
      { algorithm: 'RS256', keyid: pair.kid }
    );

    const decoded = jwt.decode(token) as any;
    expect(decoded.org_id).toBe('org_demo');
    expect(decoded.sub).toBe('client-123');
    expect(decoded.scope).toBe('clip:create clip:read');
  });

  it('should handle multiple scope formats', async () => {
    const pair = await getKeypair();

    // Space-delimited scopes (OIDC style)
    const token1 = jwt.sign(
      { sub: 'user1', scope: 'read write delete' },
      pair.priv,
      { algorithm: 'RS256', keyid: pair.kid }
    );
    const decoded1 = jwt.decode(token1) as any;
    expect(decoded1.scope).toBe('read write delete');

    // Array scopes
    const token2 = jwt.sign(
      { sub: 'user2', scopes: ['read', 'write', 'delete'] },
      pair.priv,
      { algorithm: 'RS256', keyid: pair.kid }
    );
    const decoded2 = jwt.decode(token2) as any;
    expect(decoded2.scopes).toEqual(['read', 'write', 'delete']);
  });
});

describe('Auth Module - Token Expiration', () => {
  it('should reject expired tokens', async () => {
    const pair = await getKeypair();

    // Create token that expired 1 hour ago
    const token = jwt.sign(
      { sub: 'test-user' },
      pair.priv,
      {
        algorithm: 'RS256',
        keyid: pair.kid,
        expiresIn: '-1h', // Expired
      }
    );

    expect(() => {
      jwt.verify(token, pair.pub, { algorithms: ['RS256'] });
    }).toThrow('jwt expired');
  });

  it('should accept valid non-expired tokens', async () => {
    const pair = await getKeypair();

    const token = jwt.sign(
      { sub: 'test-user' },
      pair.priv,
      {
        algorithm: 'RS256',
        keyid: pair.kid,
        expiresIn: '1h',
      }
    );

    const decoded = jwt.verify(token, pair.pub, { algorithms: ['RS256'] }) as any;
    expect(decoded.sub).toBe('test-user');
  });
});
