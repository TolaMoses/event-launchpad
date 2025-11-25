type NonceEntry = {
  nonce: string;
  message: string;
  expiresAt: number;
};

const store = new Map<string, NonceEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(address: string): string {
  return address.toLowerCase();
}

export function createNonceMessage(address: string): NonceEntry {
  const normalized = key(address);
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  const message = [
    'Sign in with your Ethereum wallet',
    `Wallet: ${normalized}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    `Expires At: ${new Date(expiresAt).toISOString()}`
  ].join('\n');

  const entry: NonceEntry = { nonce, message, expiresAt };
  store.set(normalized, entry);
  return entry;
}

export function consumeNonce(address: string): NonceEntry | null {
  const normalized = key(address);
  const entry = store.get(normalized);

  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    store.delete(normalized);
    return null;
  }

  store.delete(normalized);
  return entry;
}
