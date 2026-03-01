import { useState, useCallback } from "react";
import type { Screen } from "../types.js";

export function useNavigation(initialScreen: Screen = "main-menu") {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [history, setHistory] = useState<Screen[]>([]);

  const navigate = useCallback((next: Screen) => {
    setHistory((prev) => [...prev, screen]);
    setScreen(next);
  }, [screen]);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setScreen(last);
      return newHistory;
    });
  }, []);

  const canGoBack = history.length > 0;

  return { screen, navigate, goBack, canGoBack };
}
