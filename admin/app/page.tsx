"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) router.push("/dashboard");
    else setError(result.error ?? "Credenciais inválidas.");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%)",
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.4,
        }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* Glow accent */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(245,124,0,0.12) 0%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.05), 0 24px 48px -12px rgba(0,0,0,0.1)",
          }}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, #F57C00, #FF9A3C, #F57C00)" }}
          />

          <div className="px-10 pt-10 pb-9">
            {/* Logo */}
            <div className="flex flex-col items-center mb-9">
              <img
                src="https://cdn.100bytes.co.ao/logo/logo_100bytes.png"
                alt="100bytes"
                className="h-10 w-auto object-contain mb-7"
              />
              <div className="text-center">
                <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">
                  Acesso ao backoffice
                </h1>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                  Introduza as suas credenciais para continuar
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@100bytes.co.ao"
                  className="w-full h-11 rounded-xl px-3.5 text-sm text-gray-900 placeholder-gray-300 transition-all"
                  style={{
                    border: "1.5px solid #e5e7eb",
                    outline: "none",
                    background: "#fafafa",
                  }}
                  onFocus={e => {
                    e.target.style.border = "1.5px solid #F57C00";
                    e.target.style.background = "#fff";
                    e.target.style.boxShadow = "0 0 0 3px rgba(245,124,0,0.08)";
                  }}
                  onBlur={e => {
                    e.target.style.border = "1.5px solid #e5e7eb";
                    e.target.style.background = "#fafafa";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-medium text-gray-600">
                    Palavra-passe
                  </label>
                  <button
                    type="button"
                    className="text-[12px] text-orange-500 hover:text-orange-600 font-medium transition"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    className="w-full h-11 rounded-xl px-3.5 pr-11 text-sm text-gray-900 placeholder-gray-300 transition-all"
                    style={{
                      border: "1.5px solid #e5e7eb",
                      outline: "none",
                      background: "#fafafa",
                    }}
                    onFocus={e => {
                      e.target.style.border = "1.5px solid #F57C00";
                      e.target.style.background = "#fff";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245,124,0,0.08)";
                    }}
                    onBlur={e => {
                      e.target.style.border = "1.5px solid #e5e7eb";
                      e.target.style.background = "#fafafa";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPass ? "Ocultar" : "Mostrar"}
                  >
                    {showPass ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                  style={{ background: "#FFF5F5", border: "1px solid #FED7D7", color: "#C53030" }}
                >
                  <svg className="flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: loading
                      ? "#F57C00"
                      : "linear-gradient(135deg, #F57C00 0%, #E65100 100%)",
                    boxShadow: "0 1px 2px rgba(245,124,0,0.3), 0 4px 12px rgba(245,124,0,0.2)",
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      A autenticar...
                    </>
                  ) : (
                    <>
                      Entrar
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 flex items-center justify-center" style={{ borderTop: "1px solid #f3f4f6" }}>
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[11px] text-gray-400">Ligacao segura</span>
              </div>
            </div>
          </div>
        </div>

        {/* Version tag */}
        <p className="text-center text-[11px] text-gray-400 mt-5">
          100bytes Admin &middot; v1.0.0 &middot; 2026
        </p>
      </div>
    </div>
  );
}