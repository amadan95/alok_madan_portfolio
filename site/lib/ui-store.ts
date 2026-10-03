"use client";

import { create } from "zustand";

interface UIState {
  hideIntro: boolean;
  isDarkMode: boolean;
  isWhite: boolean;
  title: string;
  mobileTitle: string;
  number: number;
  moveNavToTop: boolean;
  scrollPosition: number;
  activeProjectSlug: string | null;
  toggleDarkMode: () => void;
  setHideIntro: (value: boolean) => void;
  setIsDarkMode: (value: boolean) => void;
  setIsWhite: (value: boolean) => void;
  setTitle: (value: string) => void;
  setMobileTitle: (value: string) => void;
  setNumber: (value: number) => void;
  setMoveNavToTop: (value: boolean) => void;
  setScrollPosition: (value: number) => void;
  setActiveProjectSlug: (value: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hideIntro: false,
  isDarkMode: false,
  isWhite: true,
  title: "Alok Madan",
  mobileTitle: "",
  number: 1,
  moveNavToTop: false,
  scrollPosition: 0,
  activeProjectSlug: null,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setHideIntro: (value) => set({ hideIntro: value }),
  setIsDarkMode: (value) => set({ isDarkMode: value }),
  setIsWhite: (value) => set({ isWhite: value }),
  setTitle: (value) => set({ title: value }),
  setMobileTitle: (value) => set({ mobileTitle: value }),
  setNumber: (value) => set({ number: value }),
  setMoveNavToTop: (value) => set({ moveNavToTop: value }),
  setScrollPosition: (value) => set({ scrollPosition: value }),
  setActiveProjectSlug: (value) => set({ activeProjectSlug: value }),
}));
