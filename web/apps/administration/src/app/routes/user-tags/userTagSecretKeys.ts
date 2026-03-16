const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");

export const generateUserTagSecretKeys = (
  cryptoImpl: Pick<Crypto, "getRandomValues"> = crypto
): { key0: string; key1: string } => {
  const key0 = new Uint8Array(16);
  const key1 = new Uint8Array(16);

  cryptoImpl.getRandomValues(key0);
  cryptoImpl.getRandomValues(key1);

  return {
    key0: bytesToHex(key0),
    key1: bytesToHex(key1),
  };
};
