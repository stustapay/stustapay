import { config } from "@/api/common";

const STATE_STORAGE_PREFIX = "sumup-oauth-state:";
export const SUMUP_OAUTH_CALLBACK_PATH = "/sumup/oauth/callback";

type SumupOauthState = {
  nodeId: number;
  nonce: string;
};

const encodeState = (state: SumupOauthState) => window.btoa(JSON.stringify(state));

const decodeState = (value: string): SumupOauthState | null => {
  try {
    return JSON.parse(window.atob(value)) as SumupOauthState;
  } catch {
    return null;
  }
};

export const getSumupOauthRedirectUrl = () => `${config.adminBaseUrl}${SUMUP_OAUTH_CALLBACK_PATH}`;

export const buildSumupOauthUrl = (nodeId: number, oauthClientId: string) => {
  const nonce = crypto.randomUUID();
  const state = { nodeId, nonce };
  sessionStorage.setItem(`${STATE_STORAGE_PREFIX}${nonce}`, JSON.stringify(state));

  const url = new URL("https://api.sumup.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", oauthClientId);
  url.searchParams.set("redirect_uri", getSumupOauthRedirectUrl());
  url.searchParams.set("state", encodeState(state));
  return url.toString();
};

/** Validate OAuth `state` against sessionStorage without removing it (safe under React Strict Mode double effects). */
export const peekValidatedSumupOauthState = (value: string | null): SumupOauthState | null => {
  if (!value) {
    return null;
  }
  const decoded = decodeState(value);
  if (!decoded) {
    return null;
  }
  const storageKey = `${STATE_STORAGE_PREFIX}${decoded.nonce}`;
  const stored = sessionStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as SumupOauthState;
    if (parsed.nonce !== decoded.nonce || parsed.nodeId !== decoded.nodeId) {
      return null;
    }
  } catch {
    return null;
  }
  return decoded;
};

export const clearSumupOauthStateNonce = (nonce: string) => {
  sessionStorage.removeItem(`${STATE_STORAGE_PREFIX}${nonce}`);
};
