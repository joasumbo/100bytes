"use client";
import { fetchAPI } from "@/lib/api";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import UserAvatar, { getInitialColor } from "@/components/admin/UserAvatar";

// ─── Crop helper ──────────────────────────────────────────────────────────────
async function getCroppedBlob(src: string, crop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 480;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, SIZE, SIZE);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas vazio"))),
        "image/webp",
        0.93
      );
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────
function CropModal({
  src,
  onConfirm,
  onClose,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setLoading(true);
    try {
      const blob = await getCroppedBlob(src, croppedArea);
      onConfirm(blob);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 m-auto bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg"
        style={{ animation: "fadeIn .2s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Recortar foto de perfil</h3>
            <p className="text-xs text-gray-400 mt-0.5">Ajuste o zoom e a posição</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div className="relative bg-black" style={{ height: 380 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: { border: "3px solid #F57C00", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
            </svg>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-orange-500 cursor-pointer"
            />
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </div>
          <p className="text-center text-xs text-gray-400 mt-1">Zoom: {zoom.toFixed(1)}×</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold transition flex items-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.35)" }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                A processar...
              </>
            ) : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({ onConfirm, onClose, loading }: { onConfirm: (pw: string) => void; onClose: () => void; loading: boolean }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        style={{ animation: "fadeIn .2s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Eliminar conta</h3>
        <p className="text-sm text-gray-500 mb-5">Esta acção é irreversível. Todos os dados serão apagados permanentemente. Confirme a sua senha para continuar.</p>
        <div className="relative mb-4">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Senha actual"
            className="w-full border border-gray-200 rounded-2xl px-4 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show
              ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button
            onClick={() => onConfirm(pw)}
            disabled={!pw || loading}
            className="flex-1 py-2.5 rounded-2xl text-sm text-white bg-red-500 hover:bg-red-600 transition font-semibold disabled:opacity-50"
          >
            {loading ? "A eliminar..." : "Eliminar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContaPage() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // State: crop
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // State: name
  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  // State: password
  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // State: delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!user) return null;

  const initial = (user.name?.[0] ?? "?").toUpperCase();
  const avatarBg = getInitialColor(user.name ?? "A");

  // ─── Photo handlers ────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setUploadLoading(true);
    setCropSrc(null);
    const form = new FormData();
    form.append("file", blob, "avatar.webp");
    form.append("userId", user!.id);
    if (user!.photoKey) form.append("oldKey", user!.photoKey);
    try {
      const res = await fetchAPI("/profile/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        updateUser({ photoKey: data.key });
      }
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!user?.photoKey) return;
    setUploadLoading(true);
    try {
      const res = await fetchAPI("/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, removePhoto: true }),
      });
      const data = await res.json();
      if (res.ok) updateUser({ photoKey: null });
      else toast.error(data.error ?? "Erro ao remover foto.");
    } finally {
      setUploadLoading(false);
    }
  }

  // ─── Name handler ──────────────────────────────────────────────────────────
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === user?.name) return;
    setNameSaving(true);
    const res = await fetchAPI("/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, name }),
    });
    const data = await res.json();
    setNameSaving(false);
    if (res.ok) {
      updateUser({ name: data.user.name });
      toast.success("Nome actualizado com sucesso.");
    } else {
      toast.error(data.error ?? "Erro ao actualizar nome.");
    }
  }

  // ─── Password handler ──────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confPw) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setPwLoading(true);
    const res = await fetchAPI("/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, currentPassword: currPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwLoading(false);
    if (res.ok) {
      toast.success("Senha alterada com sucesso.");
      setCurrPw(""); setNewPw(""); setConfPw("");
    } else {
      toast.error(data.error ?? "Erro ao alterar senha.");
    }
  }

  // ─── Delete handler ────────────────────────────────────────────────────────
  async function handleDeleteAccount(password: string) {
    setDeleteLoading(true);
    const res = await fetchAPI("/profile/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, password }),
    });
    const data = await res.json();
    setDeleteLoading(false);
    if (res.ok) {
      logout();
      router.push("/");
    } else {
      toast.error(data.error ?? "Erro ao eliminar conta.");
    }
  }

  const pwStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = pwStrength(newPw);
  const strengthColors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const strengthLabels = ["Fraca", "Razoável", "Boa", "Excelente"];

  const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-gray-900">Minha Conta</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
      </div>

      {/* ── Avatar card ── */}
      <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {uploadLoading ? (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: "#f3f4f6" }}
              >
                <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#F57C00" strokeWidth="4" />
                  <path className="opacity-75" fill="#F57C00" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            ) : (
              <UserAvatar name={user.name} photoKey={user.photoKey} size={112} textSizeClass="text-3xl" />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              title="Alterar foto"
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#F57C00" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            <span
              className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: user.role === "superadmin" ? "#FFF3E0" : "#EEF2FF", color: user.role === "superadmin" ? "#F57C00" : "#6366F1" }}
            >
              {user.role === "superadmin" ? "Superadmin" : user.role === "admin" ? "Administrador" : "Editor"}
            </span>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition bg-white"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Alterar foto
              </button>
              {user.photoKey && (
                <button
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium border border-gray-200 hover:border-red-300 hover:text-red-500 transition bg-white"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remover foto
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">WebP · máx 5 MB · recorte circular automático</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* ── Informações pessoais ── */}
      <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 className="font-bold text-gray-900 mb-1">Informações pessoais</h3>
        <p className="text-xs text-gray-400 mb-5">Actualize o seu nome de apresentação.</p>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="O seu nome" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
            <input value={user.email} readOnly className={`${inputCls} bg-gray-50 text-gray-400 cursor-default`} />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={nameSaving || !name.trim() || name.trim() === user.name}
              className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}
            >
              {nameSaving ? "A guardar..." : "Guardar alterações"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Segurança ── */}
      <div className="bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 className="font-bold text-gray-900 mb-1">Segurança</h3>
        <p className="text-xs text-gray-400 mb-5">Recomendamos uma senha forte com pelo menos 8 caracteres.</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Senha actual</label>
            <div className="relative">
              <input type={showCurr ? "text" : "password"} value={currPw} onChange={(e) => setCurrPw(e.target.value)} className={`${inputCls} pr-11`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurr(!showCurr)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurr
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          {/* New password */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nova senha</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className={`${inputCls} pr-11`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew
                  ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: i < strength ? strengthColors[strength - 1] : "#e5e7eb" }} />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength > 0 ? strengthColors[strength - 1] : "#9ca3af" }}>
                  {strength > 0 ? strengthLabels[strength - 1] : ""}
                </p>
              </div>
            )}
          </div>
          {/* Confirm password */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Confirmar nova senha</label>
            <input
              type="password"
              value={confPw}
              onChange={(e) => setConfPw(e.target.value)}
              className={`${inputCls} ${confPw && confPw !== newPw ? "border-red-300 focus:ring-red-400" : ""}`}
              placeholder="••••••••"
            />
            {confPw && confPw !== newPw && <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading || !currPw || !newPw || !confPw || newPw !== confPw}
              className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}
            >
              {pwLoading ? "A alterar..." : "Alterar senha"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Zona de perigo (only non-superadmin) ── */}
      {user.role !== "superadmin" && (
        <div className="bg-white rounded-3xl p-6 border border-red-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 className="font-bold text-red-600 mb-1">Zona de perigo</h3>
          <p className="text-xs text-gray-400 mb-5">
            A eliminação é permanente. Todos os dados associados a esta conta serão apagados e não podem ser recuperados.
          </p>
          <button
            onClick={() => { setShowDelete(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm text-red-600 font-semibold border border-red-200 hover:bg-red-50 transition"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar minha conta
          </button>
        </div>
      )}

      {/* Crop modal */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          onClose={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc); }}
          onConfirm={(blob) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            handleCropConfirm(blob);
          }}
        />
      )}

      {/* Delete account modal */}
      {showDelete && (
        <DeleteModal
          loading={deleteLoading}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}
