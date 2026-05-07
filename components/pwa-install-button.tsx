"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export const PwaInstallButton = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={() => promptEvent.prompt()}
      className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/20 px-3 py-1 text-xs font-semibold text-cyan-100"
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </button>
  );
};
