/**
 * Auth state — React context that wraps SecureStore token management.
 * Provides { session, signIn, signOut, isLoading } to the whole app.
 */
import React, { createContext, useContext, useEffect, useReducer } from "react";
import { authApi, tokenStore, type LoginResponse } from "@/lib/api";

type Session = {
  token: string;
  orgId: string;
  user: LoginResponse["user"];
};

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: Session };

type AuthAction =
  | { type: "RESTORE"; session: Session | null }
  | { type: "SIGN_IN"; session: Session }
  | { type: "SIGN_OUT" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "RESTORE":
      return action.session
        ? { status: "authenticated", session: action.session }
        : { status: "unauthenticated" };
    case "SIGN_IN":
      return { status: "authenticated", session: action.session };
    case "SIGN_OUT":
      return { status: "unauthenticated" };
  }
}

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: "loading" });

  // Restore session from SecureStore on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await tokenStore.get();
        if (stored) {
          const user = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/v1/users/me`, {
            headers: { Authorization: `Bearer ${stored.token}`, "x-org-id": stored.orgId },
          }).then((r) => (r.ok ? r.json() : null));
          if (user) {
            dispatch({ type: "RESTORE", session: { ...stored, user } });
            return;
          }
        }
      } catch {
        // ignore restore errors — fall through to unauthenticated
      }
      dispatch({ type: "RESTORE", session: null });
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const resp = await authApi.login(email, password);
    await tokenStore.save(resp.token, resp.refreshToken, resp.user.orgId);
    dispatch({
      type: "SIGN_IN",
      session: { token: resp.token, orgId: resp.user.orgId, user: resp.user },
    });
  };

  const signOut = async () => {
    await tokenStore.clear();
    dispatch({ type: "SIGN_OUT" });
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useSession(): Session | null {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.session : null;
}
