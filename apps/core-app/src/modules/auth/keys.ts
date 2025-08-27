// DEV keypair. In prod, load from disk or KMS.
import { generateKeyPairSync } from 'crypto';
import { exportJWK } from 'jose';

let _pair: { kid: string, priv: string, pub: string, jwk: any } | null = null;

export async function getKeypair() {
  if (_pair) return _pair;
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = 'dev-1';
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