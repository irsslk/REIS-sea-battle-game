"use client";

import { type FormEvent, useState } from "react";
import { X, Loader2, Mail, Lock, User, Eye, EyeOff, Anchor } from "lucide-react";
import { createClient } from "@/supabase/client";
import { getProfile, syncToSupabase } from "@/lib/profile-service";

type View = "signin" | "signup" | "verify";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px 10px 36px",
  background: "#1A150F",
  border: "1px solid rgba(63,50,40,0.9)",
  borderRadius: "6px",
  color: "#F5EDE0",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontFamily: "monospace", fontWeight: 700,
  letterSpacing: "0.15em", textTransform: "uppercase" as const,
  color: "#9A8A68", marginBottom: "4px", display: "block",
};

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = createClient();
  const clear = () => { setError(null); setInfo(null); };

  const Field = ({ label, icon: Icon, value, onChange, type = "text", placeholder }: any) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <Icon style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#9A8A68" }} />
        <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      </div>
    </div>
  );

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault(); clear();
    if (!fullName.trim()) { setError("Введите полное имя."); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов."); return; }
    if (password !== confirmPassword) { setError("Пароли не совпадают."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() } } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setView("verify"); setInfo("Код подтверждения отправлен на ваш email.");
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

  const panelStyle: React.CSSProperties = {
    position: "relative",
    width: "100%", maxWidth: "420px",
    background: "rgba(37,32,26,0.98)",
    border: "1px solid rgba(212,183,143,0.12)",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,183,143,0.07)",
  };

  const primaryBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
    width: "100%", padding: "11px",
    background: loading ? "rgba(15,122,138,0.4)" : "linear-gradient(135deg, #0A5C6B, #0F7A8A)",
    border: "none", borderRadius: "7px",
    color: "#F5EDE0",
    fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.15em",
    fontSize: "11px", textTransform: "uppercase" as const,
    cursor: loading ? "not-allowed" : "pointer",
    boxShadow: loading ? "none" : "0 0 14px rgba(15,122,138,0.3)",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div style={panelStyle}>
        <button onClick={onClose} style={{ position: "absolute", right: "16px", top: "16px", background: "none", border: "none", color: "#9A8A68", cursor: "pointer", padding: "4px" }}>
          <X style={{ width: "16px", height: "16px" }} />
        </button>

        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "20px" }}>
          <Anchor style={{ width: "14px", height: "14px", color: "#0F7A8A" }} />
          <span style={{ fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.2em", fontSize: "12px", color: "#D4B78F" }}>REIS</span>
        </div>

        {view === "signin" && (
          <>
            <p style={{ ...labelStyle, marginBottom: "2px" }}>Командный доступ</p>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#D4B78F", marginBottom: "4px" }}>Вход</h2>
            <p style={{ fontSize: "11px", color: "#9A8A68", marginBottom: "18px" }}>
              Нет аккаунта?{" "}
              <button onClick={() => { clear(); setView("signup"); }} style={{ background: "none", border: "none", color: "#0F7A8A", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", fontWeight: 700 }}>
                Регистрация
              </button>
            </p>
            <form onSubmit={handleSignin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Email" icon={Mail} value={email} onChange={setEmail} type="email" placeholder="captain@fleet.kz" />
              <div>
                <label style={labelStyle}>Пароль</label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#9A8A68" }} />
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, paddingRight: "36px" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9A8A68", cursor: "pointer" }}>
                    {showPw ? <EyeOff style={{ width: "13px", height: "13px" }} /> : <Eye style={{ width: "13px", height: "13px" }} />}
                  </button>
                </div>
              </div>
              {error && <p style={{ fontSize: "11px", color: "#FF8A8A", background: "rgba(139,34,34,0.2)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "5px", padding: "7px 10px" }}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}
                Войти
              </button>
            </form>
          </>
        )}

        {view === "signup" && (
          <>
            <p style={{ ...labelStyle, marginBottom: "2px" }}>Новый офицер</p>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#D4B78F", marginBottom: "4px" }}>Регистрация</h2>
            <p style={{ fontSize: "11px", color: "#9A8A68", marginBottom: "18px" }}>
              Уже есть аккаунт?{" "}
              <button onClick={() => { clear(); setView("signin"); }} style={{ background: "none", border: "none", color: "#0F7A8A", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", fontWeight: 700 }}>
                Войти
              </button>
            </p>
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Field label="Полное имя" icon={User} value={fullName} onChange={setFullName} placeholder="Иван Капитанов" />
              <Field label="Email" icon={Mail} value={email} onChange={setEmail} type="email" placeholder="captain@fleet.kz" />
              <div>
                <label style={labelStyle}>Пароль</label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#9A8A68" }} />
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Мин. 6 символов" style={{ ...inputStyle, paddingRight: "36px" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9A8A68", cursor: "pointer" }}>
                    {showPw ? <EyeOff style={{ width: "13px", height: "13px" }} /> : <Eye style={{ width: "13px", height: "13px" }} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Подтвердите пароль</label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#9A8A68" }} />
                  <input type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ fontSize: "11px", color: "#FF8A8A", background: "rgba(139,34,34,0.2)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "5px", padding: "7px 10px" }}>{error}</p>}
              {info  && <p style={{ fontSize: "11px", color: "#7AC8D8", background: "rgba(10,92,107,0.2)", border: "1px solid rgba(15,122,138,0.3)", borderRadius: "5px", padding: "7px 10px" }}>{info}</p>}
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}
                Создать аккаунт
              </button>
            </form>
          </>
        )}

        {view === "verify" && (
          <>
            <p style={{ ...labelStyle, marginBottom: "2px" }}>Верификация</p>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#D4B78F", marginBottom: "4px" }}>Код подтверждения</h2>
            <p style={{ fontSize: "11px", color: "#9A8A68", marginBottom: "18px" }}>
              6-значный код отправлен на <span style={{ color: "#D4B78F", fontFamily: "monospace" }}>{email}</span>
            </p>
            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text" inputMode="numeric" maxLength={6} required
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  width: "100%", padding: "14px 8px",
                  background: "#1A150F",
                  border: "1px solid rgba(63,50,40,0.9)",
                  borderRadius: "8px",
                  color: "#E8C97F",
                  fontSize: "28px", fontFamily: "monospace", fontWeight: 800,
                  letterSpacing: "0.6em", textAlign: "center",
                  outline: "none", boxSizing: "border-box" as const,
                }}
              />
              {error && <p style={{ fontSize: "11px", color: "#FF8A8A", background: "rgba(139,34,34,0.2)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "5px", padding: "7px 10px" }}>{error}</p>}
              {info  && <p style={{ fontSize: "11px", color: "#7AC8D8", background: "rgba(10,92,107,0.2)", border: "1px solid rgba(15,122,138,0.3)", borderRadius: "5px", padding: "7px 10px" }}>{info}</p>}
              <button type="submit" disabled={loading || otp.length !== 6} style={{ ...primaryBtn, opacity: otp.length !== 6 ? 0.5 : 1 }}>
                {loading && <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />}
                Подтвердить
              </button>
              <button type="button" onClick={handleResend} disabled={loading} style={{ background: "none", border: "none", color: "#9A8A68", fontSize: "10px", fontFamily: "monospace", cursor: "pointer", padding: "4px", textAlign: "center" }}>
                Не пришёл код? Отправить повторно
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
