import { useState, useCallback } from "react";

interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newState: T) => void;
  history: T[];
  currentIndex: number;
}

export function useUndoRedo<T>({
  initialState,
  maxHistory = 50,
}: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prevHistory) => {
        const currentState = prevHistory[currentIndex];
        const resolvedState =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(currentState)
            : newState;

        // Remove any future history after current index
        const newHistory = prevHistory.slice(0, currentIndex + 1);
        newHistory.push(resolvedState);

        // Limit history size
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          return newHistory;
        }

        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });
      setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
    },
    [currentIndex, maxHistory]
  );

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const reset = useCallback((newState: T) => {
    setHistory([newState]);
    setCurrentIndex(0);
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    reset,
    history,
    currentIndex,
  };
}
