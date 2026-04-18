import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  ClerkProvider,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";

import { authEnabled, clerkPublishableKey } from "./config";
import { setAuthTokenProvider } from "./session";


type AppAuthUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AppAuthContextValue = {
  enabled: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AppAuthUser | null;
  error: string | null;
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
};

const noop = async () => {};

const defaultContextValue: AppAuthContextValue = {
  enabled: false,
  isLoading: false,
  isAuthenticated: false,
  user: null,
  error: null,
  signIn: noop,
  signUp: noop,
  signOut: noop,
};

const AppAuthContext = createContext<AppAuthContextValue>(defaultContextValue);


function ClerkContextBridge({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const clerk = useClerk();
  const { user } = useUser();

  useEffect(() => {
    setAuthTokenProvider(() => auth.getToken());
    return () => {
      setAuthTokenProvider(null);
    };
  }, [auth]);

  const value = useMemo<AppAuthContextValue>(
    () => ({
      enabled: true,
      isLoading: !auth.isLoaded,
      isAuthenticated: Boolean(auth.isSignedIn),
      user: user
        ? {
            sub: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName ?? user.username ?? user.firstName ?? undefined,
            picture: user.imageUrl,
          }
        : null,
      error: null,
      signIn: async () => {
        clerk.openSignIn({});
      },
      signUp: async () => {
        clerk.openSignUp({});
      },
      signOut: async () => {
        await clerk.signOut({ redirectUrl: window.location.origin });
      },
    }),
    [auth.isLoaded, auth.isSignedIn, clerk, user],
  );

  return (
    <AppAuthContext.Provider value={value}>
      {children}
    </AppAuthContext.Provider>
  );
}


export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (!authEnabled || !clerkPublishableKey) {
    return (
      <AppAuthContext.Provider value={defaultContextValue}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkContextBridge>{children}</ClerkContextBridge>
    </ClerkProvider>
  );
}


export function useAppAuth() {
  return useContext(AppAuthContext);
}
