type TokenProvider = () => Promise<string | null>;

let activeTokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider | null) {
  activeTokenProvider = provider;
}

export async function getStoredAuthToken(): Promise<string | null> {
  if (!activeTokenProvider) {
    return null;
  }

  try {
    return await activeTokenProvider();
  } catch {
    return null;
  }
}
