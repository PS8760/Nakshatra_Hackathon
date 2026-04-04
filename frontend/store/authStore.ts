import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem("nr_token", token);
    localStorage.setItem("nr_user", JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("nr_token");
    localStorage.removeItem("nr_user");
    set({ user: null, token: null });
  },

  hydrate: () => {
    const token = localStorage.getItem("nr_token");
    const userStr = localStorage.getItem("nr_user");
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
      } catch {}
    }
  },
}));
