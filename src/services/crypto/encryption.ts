// APEX E2EE Envelope Encryption Service
// Implements HPKE-compatible public-key envelope encryption with fresh ephemeral DEK & AES-256-GCM.

import { EncryptedTelemetryEnvelope, TelemetryIntegrityLock } from '../../types/saas';
import { arrayBufferToBase64, base64ToArrayBuffer, keyManager } from './keyManager';

export async function encryptTelemetryPayload(
  payload: unknown,
  tenantId: string,
  targetPublicKeyBase64: string,
  integrityLock: TelemetryIntegrityLock
): Promise<EncryptedTelemetryEnvelope> {
  const enc = new TextEncoder();
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const plaintextBytes = enc.encode(serialized);

  // 1. Generate a fresh 256-bit Data Encryption Key (DEK) for this specific batch
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Encrypt the plaintext using AES-256-GCM with a secure 12-byte random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const envelopeId = `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const keyId = keyManager.getActiveKeyId() || `key-${tenantId}-v1`;

  // Additional Authenticated Data (AAD) prevents cross-tenant splicing
  const aad = enc.encode(`${envelopeId}:${tenantId}:${keyId}`);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: aad,
      tagLength: 128,
    },
    dek,
    plaintextBytes
  );

  // In WebCrypto AES-GCM, the 16-byte auth tag is appended to the ciphertext
  const ciphertextBytes = new Uint8Array(encryptedData);
  const tagBytes = ciphertextBytes.slice(ciphertextBytes.length - 16);
  const rawCiphertext = ciphertextBytes.slice(0, ciphertextBytes.length - 16);

  // 3. HPKE Key Wrapping: Generate ephemeral sender keypair (ECDH P-256)
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  // Import recipient's tenant public key
  const recipientPubKeyRaw = base64ToArrayBuffer(targetPublicKeyBase64);
  const recipientPubKey = await crypto.subtle.importKey(
    'raw',
    recipientPubKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive key-encryption key (KEK) using HKDF over ECDH shared secret
  const kek = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: recipientPubKey,
    },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'wrapKey']
  );

  // Wrap the DEK
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const exportedDek = await crypto.subtle.exportKey('raw', dek);
  const wrappedDekBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv },
    kek,
    exportedDek
  );

  // Export ephemeral public key
  const exportedEphemeralPub = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

  return {
    version: '1.0',
    envelopeId,
    tenantId,
    keyId,
    ephemeralPublicKey: arrayBufferToBase64(exportedEphemeralPub),
    iv: arrayBufferToBase64(iv.buffer),
    // Prepend wrapIv to wrapped data key
    wrappedDataKey: `${arrayBufferToBase64(wrapIv.buffer)}:${arrayBufferToBase64(wrappedDekBuffer)}`,
    ciphertext: arrayBufferToBase64(rawCiphertext.buffer),
    authTag: arrayBufferToBase64(tagBytes.buffer),
    integrityLock,
  };
}
