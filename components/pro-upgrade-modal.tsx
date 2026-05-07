"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

export const ProUpgradeModal = ({ label }: { label: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-200"
      >
        <Crown className="h-4 w-4" />
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a2444] p-5">
            <h3 className="text-xl font-bold">Upgrade to Pro</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>- Расширенный AI Coach и персональные тренды</li>
              <li>- Эксклюзивные скины и темы</li>
              <li>- Режим без рекламы</li>
              <li>- Премиум турниры и профильные бейджи</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button type="button" className="rounded-lg bg-emerald-300 px-3 py-2 font-semibold text-slate-900">
                Скоро в релизе
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/20 px-3 py-2">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
