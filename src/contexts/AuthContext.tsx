import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { upsertMyProfile } from "@/services/profiles.service";
import {
  ensureGuestSession,
  isGuestSessionActive,
  clearGuestSessionData,
} from "@/lib/guestSession";

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ hasSession: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
const [user, setUser] = useState<SupabaseUser | null>(null);
const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        clearGuestSessionData();
        setIsGuest(false);
      } else if (isGuestSessionActive()) {
        setIsGuest(true);
      } else {
        setIsGuest(false);
      }
      if (sessionUser) {
        upsertMyProfile(sessionUser).catch((error) => {
          console.error("PROFILE UPSERT FAILED:", error);
        });
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        clearGuestSessionData();
        setIsGuest(false);
        upsertMyProfile(sessionUser).catch((error) => {
          console.error("PROFILE UPSERT FAILED:", error);
        });
      } else if (!isGuestSessionActive()) {
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signup = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;

    // Supabase can return no hard error for existing users depending on project settings.
    const identities = (data.user as any)?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      throw new Error("User already registered");
    }

    return { hasSession: !!data.session };
  };

 const loginAsGuest = () => {
  clearGuestSessionData();
  ensureGuestSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("guest:session-changed"));
  }
  setUser(null);       // guest is NOT a Supabase user
  setIsGuest(true);    // separate flag
  setLoading(false);
};

const logout = async () => {
  if (isGuest) {
    clearGuestSessionData();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("guest:session-changed"));
    }
    setUser(null);
    setIsGuest(false);
    setLoading(false);
    return;
  }

  await supabase.auth.signOut();
  setUser(null);
  setIsGuest(false);
  setLoading(false);
};


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
isAuthenticated: !!user,
        isGuest,
        login,
        loginAsGuest,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
