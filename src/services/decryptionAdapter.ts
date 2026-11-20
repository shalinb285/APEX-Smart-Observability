// APEX Transparent Decryption & Integrity Adapter
// Intercepts API responses and WebSocket streams.
// Decrypts encrypted envelopes locally in the browser and feeds normal expected structs
// to existing dashboard components without modifying existing monitoring pages.

import { EncryptedTelemetryEnvelope } from '../types/saas';
import { decryptTelemetryPayload } from './crypto/decryption';
import { integrityLockValidator } from './crypto/integrityLock';
import { keyManager } from './crypto/keyManager';

export function isEncryptedEnvelope(obj: unknown): obj is EncryptedTelemetryEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ciphertext' in obj &&
    'wrappedDataKey' in obj &&
    'integrityLock' in obj
  );
}

/**
 * Transparently unpacks data:
 * If the server returned an encrypted envelope, validates the integrity lock and decrypts it.
 * If the server returned unencrypted data (e.g. legacy or unencrypted mode), returns as-is.
 */
export async function adaptAndDecryptResponse<T>(data: unknown): Promise<T> {
  if (isEncryptedEnvelope(data)) {
    // 1. Verify Telemetry Integrity Lock
    const integrityResult = await integrityLockValidator.verifyEnvelopeIntegrity(data);

    if (!integrityResult.valid && integrityResult.state === 'REVOKED') {
      throw new Error(`[SECURITY ALERT] Telemetry rejected: Device revoked. ${integrityResult.reason}`);
    }

    if (!integrityResult.valid && integrityResult.state === 'QUARANTINED') {
      console.warn(`[TELEMETRY QUARANTINED] Sequence / replay violation: ${integrityResult.reason}`);
      throw new Error(`[SECURITY] Envelope quarantined: ${integrityResult.reason}`);
    }

    // 2. Decrypt envelope using tenant's client-side in-memory private key
    if (!keyManager.isVaultUnlocked()) {
      // Auto-unlock vault with session passphrase for seamless demo continuity
      await keyManager.unlockVault('org-apex-enterprise');
    }

    return await decryptTelemetryPayload<T>(data);
  }

  // Unencrypted passthrough
  return data as T;
}
