import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { supabase } from "../supabaseClient";

export interface HistoryItem {
  id: string;
  type: "translation" | "summarization" | "speech-to-text" | "text-to-speech";
  input: string;
  output: string;
  metadata?: {
    fromLang?: string;
    toLang?: string;
    confidence?: number;
    voice?: string;
    summaryLength?: string;
  };
  timestamp: number;
}

interface NLPState {
  history: HistoryItem[];
  isLoading: boolean;
  theme: "light" | "dark";
}

interface NLPContextType {
  state: NLPState;
  addToHistory: (item: Omit<HistoryItem, "id" | "timestamp">) => Promise<void>;
  clearHistory: () => Promise<void>;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  loadHistory: () => Promise<void>;
}

const initialState: NLPState = {
  history: [],
  isLoading: false,
  theme: (localStorage.getItem("nlp-theme") as "light" | "dark") || "light",
};

type NLPAction =
  | { type: "ADD_TO_HISTORY"; payload: HistoryItem }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_HISTORY"; payload: HistoryItem[] }
  | { type: "TOGGLE_THEME" }
  | { type: "SET_LOADING"; payload: boolean };

const nlpReducer = (state: NLPState, action: NLPAction): NLPState => {
  switch (action.type) {
    case "ADD_TO_HISTORY":
      return { ...state, history: [action.payload, ...state.history] };

    case "CLEAR_HISTORY":
      return { ...state, history: [] };

    case "LOAD_HISTORY":
      return { ...state, history: action.payload };

    case "TOGGLE_THEME":
      const newTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("nlp-theme", newTheme);
      return { ...state, theme: newTheme };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
};

const NLPContext = createContext<NLPContextType | undefined>(undefined);

// ✅ Global variable that stores loadHistory & clearHistory (NO hooks required)
let externalStoreFns: {
  loadHistory?: () => Promise<void>;
  clearHistory?: () => Promise<void>;
} = {};

export const NLPProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(nlpReducer, initialState);

  const addToHistory = async (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    dispatch({ type: "ADD_TO_HISTORY", payload: newItem });

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase.from("history").insert({
      user_id: user.id,
      type: item.type,
      input: item.input,
      output: item.output,
      metadata: item.metadata,
      timestamp: newItem.timestamp,
    });
  };

  const clearHistory = async () => {
    dispatch({ type: "CLEAR_HISTORY" });

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase.from("history").delete().eq("user_id", user.id);
  };

  const loadHistory = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data } = await supabase
      .from("history")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false });

    dispatch({ type: "LOAD_HISTORY", payload: data || [] });
  };

  const toggleTheme = () => dispatch({ type: "TOGGLE_THEME" });

  const setLoading = (loading: boolean) =>
    dispatch({ type: "SET_LOADING", payload: loading });

  // ✅ Store these functions globally so AuthContext can call them without hooks
  externalStoreFns = {
    loadHistory,
    clearHistory,
  };

  return (
    <NLPContext.Provider
      value={{
        state,
        addToHistory,
        clearHistory,
        toggleTheme,
        setLoading,
        loadHistory,
      }}
    >
      <div className={state.theme}>{children}</div>
    </NLPContext.Provider>
  );
};

export const useNLP = () => {
  const context = useContext(NLPContext);
  if (!context) throw new Error("useNLP must be used within NLPProvider");
  return context;
};

// ✅ exported SAFE accessor (used by AuthContext)
export const getNLPStoreFns = () => externalStoreFns;
