"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type AgentShellContext = {
  isOpen: boolean;
  pendingPrompt: string | null;
  openAgent: (prompt?: string) => void;
  closeAgent: () => void;
  consumePendingPrompt: () => string | null;
};

const AgentContext = createContext<AgentShellContext | null>(null);

export function AgentShellProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const openAgent = useCallback((prompt?: string) => {
    setIsOpen(true);
    if (prompt) setPendingPrompt(prompt);
  }, []);

  const closeAgent = useCallback(() => setIsOpen(false), []);

  const consumePendingPrompt = useCallback(() => {
    const p = pendingPrompt;
    setPendingPrompt(null);
    return p;
  }, [pendingPrompt]);

  return (
    <AgentContext.Provider
      value={{ isOpen, pendingPrompt, openAgent, closeAgent, consumePendingPrompt }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentShell() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentShell must be used within AgentShellProvider");
  return ctx;
}
