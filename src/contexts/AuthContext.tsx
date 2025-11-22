import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { supabase } from "../supabaseClient";
import { getNLPStoreFns as getNLPFns } from "../contexts/NLPContext";
   // ✅ SAFE import (no hooks)

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: any }
  | { type: "AUTH_FAILURE" }
  | { type: "LOGOUT" };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, isLoading: true };
    case "AUTH_SUCCESS":
      return { ...state, user: action.payload, isLoading: false, isAuthenticated: true };
    case "AUTH_FAILURE":
      return { ...state, user: null, isLoading: false, isAuthenticated: false };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (email: string, password: string) => {
    dispatch({ type: "AUTH_START" });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dispatch({ type: "AUTH_FAILURE" });
      throw error;
    }

    dispatch({ type: "AUTH_SUCCESS", payload: data.user });

    try {
      getNLPFns().loadHistory();
    } catch (err) {
      console.warn("NLPContext not available yet, skipping history load.");
    }
   // ✅ No hooks
  };

  const register = async (email: string, password: string, fullName: string) => {
    dispatch({ type: "AUTH_START" });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { fullName } },
    });

    if (error) {
      dispatch({ type: "AUTH_FAILURE" });
      throw error;
    }

    dispatch({ type: "AUTH_SUCCESS", payload: data.user });

    try {
      getNLPFns().loadHistory();
    } catch (err) {
      console.warn("NLPContext not available yet, skipping history load.");
    }

  };

  const logout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: "LOGOUT" });

    try {
      getNLPFns().loadHistory();
    } catch (err) {
      console.warn("NLPContext not available yet, skipping history load.");
    }
 // ✅ no hooks
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user || null;

    if (user) {
      dispatch({ type: "AUTH_SUCCESS", payload: user });
      try {
        getNLPFns().loadHistory();
      } catch (err) {
        console.warn("NLPContext not available yet, skipping history load.");
      }

    } else {
      dispatch({ type: "AUTH_FAILURE" });
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
