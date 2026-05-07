"use client";

import { type FormEvent, useState } from "react";
import { X, Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/supabase/client";
import { getProfile, syncToSupabase } from "@/lib/profile-service";

type View = "signin" | "signup" | "verify";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = createClient();
  const clear = () => { setError(null); setInfo(null); };

  const inputCls = "w-full rounded-xl border border-[#C9AA88] bg-[#F8F1E9] py-2.5 pl-9 pr-4 text-sm text-[#2C1A0E] placeholder-[#B8A080] focus:border-[#8B5A2B] focus:outline-none";

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault(); clear();
    if (!fullName.trim()) { setError("Введите полное имя."); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов."); return; }
    if (password !== confirmPassword) { setError("Пароли не совпадают."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setView("verify");
    setInfo("Код отправлен на вашу почту.");
  };

  const handleSignin = async (e: FormEvent) => {
    e.preventDefault(); clear(); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) await syncToSupabase(getProfile());
    onClose(); window.location.reload();
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault(); clear();
    if (otp.length !== 6) { setError("Введите 6-значный код."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) await syncToSupabase(getProfile());
    onClose(); window.location.reload();
  };

  const handleResend = async () => {
    clear(); setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    error ? setError(error.message) : setInfo("Новый код отправлен!");
  };

  const FieldIcon = ({ icon: Icon }: { icon: typeof Mail }) => (
    <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A080]" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2C1A0E]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[#C9AA88] bg-[#F0E6D8] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-[#9E7B5A] hover:text-[#2C1A0E]" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        {view === "signin" && (
          <>
            <h2 className="mb-1 text-xl font-extrabold text-[#2C1A0E]">Вход в аккаунт</h2>
            <p className="mb-5 text-sm text-[#8B6B4A]">
              Нет аккаунта?{" "}
              <button className="font-semibold text-[#8B5A2B] hover:underline" onClick={() => { clear(); setView("signup"); }}>
                Зарегистрироваться
              </button>
            </p>
            <form onSubmit={handleSignin} className="space-y-3">
              <div className="relative"><FieldIcon icon={Mail} /><input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></div>
              <div className="relative">
                <FieldIcon icon={Lock} />
                <input type={showPassword ? "text" : "password"} required placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A080]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="rounded-xl bg-[#8B2B2B]/10 px-3 py-2 text-xs text-[#8B2B2B]">{error}</p>}
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5A2B] py-2.5 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Войти
              </button>
            </form>
          </>
        )}

        {view === "signup" && (
          <>
            <h2 className="mb-1 text-xl font-extrabold text-[#2C1A0E]">Создать аккаунт</h2>
            <p className="mb-5 text-sm text-[#8B6B4A]">
              Уже есть аккаунт?{" "}
              <button className="font-semibold text-[#8B5A2B] hover:underline" onClick={() => { clear(); setView("signin"); }}>
                Войти
              </button>
            </p>
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="relative"><FieldIcon icon={User} /><input type="text" required placeholder="Полное имя" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
              <div className="relative"><FieldIcon icon={Mail} /><input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></div>
              <div className="relative">
                <FieldIcon icon={Lock} />
                <input type={showPassword ? "text" : "password"} required placeholder="Пароль (мин. 6 символов)" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A080]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative"><FieldIcon icon={Lock} /><input type={showPassword ? "text" : "password"} required placeholder="Подтвердите пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} /></div>
              {error && <p className="rounded-xl bg-[#8B2B2B]/10 px-3 py-2 text-xs text-[#8B2B2B]">{error}</p>}
              {info  && <p className="rounded-xl bg-[#6B8B2B]/10 px-3 py-2 text-xs text-[#3A5A0E]">{info}</p>}
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5A2B] py-2.5 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Создать аккаунт
              </button>
            </form>
          </>
        )}

        {view === "verify" && (
          <>
            <h2 className="mb-1 text-xl font-extrabold text-[#2C1A0E]">Подтверждение email</h2>
            <p className="mb-5 text-sm text-[#8B6B4A]">
              Введите 6-значный код, отправленный на <span className="font-semibold text-[#2C1A0E]">{email}</span>
            </p>
            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-[#C9AA88] bg-[#F8F1E9] py-3 text-center text-3xl font-bold tracking-[0.5em] text-[#2C1A0E] placeholder-[#C9AA88] focus:border-[#8B5A2B] focus:outline-none"
              />
              {error && <p className="rounded-xl bg-[#8B2B2B]/10 px-3 py-2 text-xs text-[#8B2B2B]">{error}</p>}
              {info  && <p className="rounded-xl bg-[#6B8B2B]/10 px-3 py-2 text-xs text-[#3A5A0E]">{info}</p>}
              <button type="submit" disabled={loading || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5A2B] py-2.5 text-sm font-bold text-[#F5EDE4] transition hover:bg-[#6B4020] disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Подтвердить и войти
              </button>
              <button type="button" onClick={handleResend} disabled={loading} className="w-full text-center text-xs text-[#9E7B5A] hover:text-[#8B5A2B] disabled:opacity-50">
                Не пришёл код? Отправить снова
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
