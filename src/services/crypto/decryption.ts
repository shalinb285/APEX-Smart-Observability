// APEX E2EE Decryption Engine
// Runs purely inside the browser client memory.
// Decrypts HPKE-wrapped envelopes without the SaaS backend ever learning the tenant private key.

import { EncryptedTelemetryEnvelope } from '../../types/saas';
import { base64ToArrayBuffer, keyManager } from './keyManager';

export async function decryptTelemetryPayload<T = unknown>(
  envelope: EncryptedTelemetryEnvelope
): Promise<T> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // 1. Retrieve the tenant private key for this keyId
  const tenantPrivateKey = keyManager.getPrivateKey(envelope.keyId);
  if (!tenantPrivateKey) {
    throw new Error(
      `Tenant private key [${envelope.keyId}] is not available in local memory vault. Please unlock your key vault.`
    );
  }

  // 2. Import the ephemeral public key sent by the edge device/agent
  const ephemeralPubRaw = base64ToArrayBuffer(envelope.ephemeralPublicKey);
  const ephemeralPubKey = await crypto.subtle.importKey(
    'raw',
    ephemeralPubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Derive shared KEK using ECDH between tenant private key and ephemeral public key
  const kek = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: ephemeralPubKey,
    },
    tenantPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 4. Unwrap the Data Encryption Key (DEK)
  const [wrapIvBase64, wrappedDekBase64] = envelope.wrappedDataKey.split(':');
  if (!wrapIvBase64 || !wrappedDekBase64) {
    throw new Error('Malformed wrappedDataKey in telemetry envelope.');
  }

  const wrapIv = base64ToArrayBuffer(wrapIvBase64);
  const wrappedDek = base64ToArrayBuffer(wrappedDekBase64);

  const rawDek = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapIv },
    kek,
    wrappedDek
  );

  const dek = await crypto.subtle.importKey(
    'raw',
    rawDek,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 5. Decrypt the telemetry payload with the recovered DEK and IV
  const iv = base64ToArrayBuffer(envelope.iv);
  const rawCiphertext = new Uint8Array(base64ToArrayBuffer(envelope.ciphertext));
  const tagBytes = new Uint8Array(base64ToArrayBuffer(envelope.authTag));

  // In WebCrypto AES-GCM, the ciphertext buffer passed to decrypt must include the auth tag at the end
  const combinedCiphertext = new Uint8Array(rawCiphertext.length + tagBytes.length);
  combinedCiphertext.set(rawCiphertext, 0);
  combinedCiphertext.set(tagBytes, rawCiphertext.length);

  const aad = enc.encode(`${envelope.envelopeId}:${envelope.tenantId}:${envelope.keyId}`);

  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: aad,
      tagLength: 128,
    },
    dek,
    combinedCiphertext.buffer
  );

  const jsonString = dec.decode(plaintextBuffer);
  return JSON.parse(jsonString) as T;
}
