// Auth context — provides the signed-in parent user and auth actions.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { backend } from "../lib/backend";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe = null;

    backend.auth.getCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    });

    // onAuthChange resolves asynchronously through the backend proxy, so the
    // returned unsubscribe function arrives in a promise.
    Promise.resolve(backend.auth.onAuthChange((u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    })).then((fn) => {
      if (active) unsubscribe = fn;
      else fn?.();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { user: u, error } = await backend.auth.signIn(email, password);
    if (error) return { error: error.message };
    setUser(u);
    return { user: u, error: null };
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const { user: u, error } = await backend.auth.signUp(email, password, name);
    if (error) return { error: error.message };
    setUser(u);
    return { user: u, error: null };
  }, []);

  const signOut = useCallback(async () => {
    await backend.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
