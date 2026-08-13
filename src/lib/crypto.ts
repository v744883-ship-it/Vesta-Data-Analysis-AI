const enc = new TextEncoder();
const dec = new TextDecoder();

const VERIFIER_PLAINTEXT = "vesta-vault-v1";
const PBKDF2_ITERATIONS = 250_000;

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromB64(saltB64) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext),
  );
  return { iv: toB64(iv), ciphertext: toB64(cipher) };
}

export async function decryptText(key: CryptoKey, ivB64: string, ciphertextB64: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as unknown as BufferSource },
    key,
    fromB64(ciphertextB64) as unknown as BufferSource,
  );
  return dec.decode(plain);
}

/** Creates the stored proof that a password is correct, without storing the password. */
export async function makeVerifier(key: CryptoKey): Promise<string> {
  const { iv, ciphertext } = await encryptText(key, VERIFIER_PLAINTEXT);
  return `${iv}.${ciphertext}`;
}

export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  const [iv, ciphertext] = verifier.split(".");
  if (!iv || !ciphertext) return false;
  try {
    return (await decryptText(key, iv, ciphertext)) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
