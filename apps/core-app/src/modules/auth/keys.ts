// Production-ready keypair management with persistent storage
import { generateKeyPairSync, createPrivateKey, createPublicKey } from 'crypto';
import { exportJWK } from 'jose';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

let _pair: { kid: string, priv: string, pub: string, jwk: any } | null = null;

/**
 * Get or generate RSA keypair for JWT signing
 * - In production: loads from disk at path specified by AUTH_KEYS_DIR env var
 * - In development: generates ephemeral keypair (not recommended for production)
 * - Auto-generates and persists keys if AUTH_KEYS_DIR is set but keys don't exist
 */
export async function getKeypair() {
  if (_pair) return _pair;

  const keysDir = process.env.AUTH_KEYS_DIR;
  const kid = process.env.AUTH_KEY_ID || 'wavestack-1';

  // Production mode: load from disk or generate and persist
  if (keysDir) {
    const privPath = join(keysDir, 'jwt-private.pem');
    const pubPath = join(keysDir, 'jwt-public.pem');

    // Try to load existing keys
    if (existsSync(privPath) && existsSync(pubPath)) {
      console.log(`[auth] Loading RSA keypair from ${keysDir}`);
      const privPem = readFileSync(privPath, 'utf-8');
      const pubPem = readFileSync(pubPath, 'utf-8');

      const publicKey = createPublicKey(pubPem);
      const jwk = await exportJWK(publicKey as any);
      jwk.kid = kid;
      jwk.alg = 'RS256';
      jwk.kty = 'RSA';

      _pair = { kid, priv: privPem, pub: pubPem, jwk };
      console.log(`[auth] Loaded keypair with kid=${kid}`);
      return _pair;
    }

    // Keys don't exist, generate and save
    console.log(`[auth] No keys found in ${keysDir}, generating new keypair...`);
    if (!existsSync(keysDir)) {
      mkdirSync(keysDir, { recursive: true });
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });

    const privPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const pubPem = publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();

    writeFileSync(privPath, privPem, { mode: 0o600 }); // Only owner can read/write
    writeFileSync(pubPath, pubPem, { mode: 0o644 });  // Public key can be read by all

    const jwk = await exportJWK(publicKey as any);
    jwk.kid = kid;
    jwk.alg = 'RS256';
    jwk.kty = 'RSA';

    _pair = { kid, priv: privPem, pub: pubPem, jwk };
    console.log(`[auth] Generated and saved new keypair to ${keysDir} with kid=${kid}`);
    return _pair;
  }

  // Development mode: generate ephemeral keypair (not persisted)
  console.warn('[auth] ⚠️  Generating ephemeral RSA keypair (not recommended for production)');
  console.warn('[auth] ⚠️  Set AUTH_KEYS_DIR environment variable to persist keys across restarts');

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = await exportJWK(publicKey as any);
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.kty = 'RSA';

  _pair = {
    kid,
    priv: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
    pub: publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
    jwk,
  };
  return _pair;
}