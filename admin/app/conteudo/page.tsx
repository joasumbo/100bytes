"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { mockBanners } from "@/lib/mock";

type TabKey = "sliders" | "banners" | "paginas" | "blocos";

type SliderItem = {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  order: number;
  active: boolean;
};

type BannerItem = {
  id: string;
  title: string;
  position: string;
  image: string;
  link: string;
  order: number;
  active: boolean;
};

type InstitutionalPage = {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  status: "published" | "draft";
  showInFooter: boolean;
};

type HomeBlock = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
};

type ContentEntryResponse<T> = {
  entry: {
    key: string;
    data: T;
  } | null;
};

const CONTENT_KEYS = {
  sliders: "home-sliders",
  banners: "home-banners",
  pages: "institutional-pages",
  blocks: "home-blocks",
} as const;

const initialSliders: SliderItem[] = [
  {
    id: "SL001",
    title: "Potência para o seu dia",
    subtitle: "Portáteis e desktops com entrega nacional.",
    ctaText: "Ver portáteis",
    ctaLink: "/computadores-portateis",
    image: "https://cdn.100bytes.co.ao/hero/hero1.png",
    order: 1,
    active: true,
  },
  {
    id: "SL002",
    title: "Promoções em software",
    subtitle: "Office, antivírus e soluções empresariais.",
    ctaText: "Ver software",
    ctaLink: "/software",
    image: "https://cdn.100bytes.co.ao/hero/hero2.png",
    order: 2,
    active: true,
  },
];

const initialPages: InstitutionalPage[] = [
  { id: "PG001", title: "Sobre Nós", slug: "sobre-nos", updatedAt: "2026-05-11 18:05", status: "published", showInFooter: true },
  { id: "PG002", title: "Termos e Condições", slug: "termos-e-condicoes", updatedAt: "2026-05-11 18:01", status: "published", showInFooter: true },
  { id: "PG003", title: "Política de Privacidade", slug: "politica-de-privacidade", updatedAt: "2026-05-10 10:12", status: "published", showInFooter: true },
  { id: "PG004", title: "FAQ", slug: "faq", updatedAt: "2026-05-09 13:47", status: "draft", showInFooter: true },
];

const initialBlocks: HomeBlock[] = [
  { id: "BL001", name: "Vantagens da Loja", description: "Linha de ícones abaixo do slider principal.", enabled: true, updatedAt: "2026-05-11 17:52" },
  { id: "BL002", name: "Ofertas em Destaque", description: "Card principal de oferta na home.", enabled: true, updatedAt: "2026-05-11 17:40" },
  { id: "BL003", name: "Marcas", description: "Carrossel de marcas na home.", enabled: true, updatedAt: "2026-05-11 17:21" },
  { id: "BL004", name: "Vistos Recentemente", description: "Sessão dinâmica com localStorage.", enabled: false, updatedAt: "2026-05-08 12:04" },
];

export default function ConteudoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("sliders");
  const [sliders, setSliders] = useState<SliderItem[]>(initialSliders);
  const [banners, setBanners] = useState<BannerItem[]>(mockBanners);
  const [pages, setPages] = useState<InstitutionalPage[]>(initialPages);
  const [blocks, setBlocks] = useState<HomeBlock[]>(initialBlocks);
  const [loadingContent, setLoadingContent] = useState(true);
  const [savingTab, setSavingTab] = useState<TabKey | null>(null);

  const [sliderForm, setSliderForm] = useState<Omit<SliderItem, "id">>({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    image: "",
    order: 1,
    active: true,
  });

  const stats = useMemo(() => {
    return {
      slidersAtivos: sliders.filter((s) => s.active).length,
      bannersAtivos: banners.filter((b) => b.active).length,
      paginasPublicadas: pages.filter((p) => p.status === "published").length,
      blocosAtivos: blocks.filter((b) => b.enabled).length,
    };
  }, [sliders, banners, pages, blocks]);

  useEffect(() => {
    async function loadContent() {
      setLoadingContent(true);
      try {
        const [slidersRes, bannersRes, pagesRes, blocksRes] = await Promise.all([
          api.get<ContentEntryResponse<SliderItem[]>>(`/content/${CONTENT_KEYS.sliders}`),
          api.get<ContentEntryResponse<BannerItem[]>>(`/content/${CONTENT_KEYS.banners}`),
          api.get<ContentEntryResponse<InstitutionalPage[]>>(`/content/${CONTENT_KEYS.pages}`),
          api.get<ContentEntryResponse<HomeBlock[]>>(`/content/${CONTENT_KEYS.blocks}`),
        ]);

        if (slidersRes.entry && Array.isArray(slidersRes.entry.data)) {
          setSliders([...slidersRes.entry.data].sort((a, b) => a.order - b.order));
        }
        if (bannersRes.entry && Array.isArray(bannersRes.entry.data)) {
          setBanners([...bannersRes.entry.data].sort((a, b) => a.order - b.order));
        }
        if (pagesRes.entry && Array.isArray(pagesRes.entry.data)) {
          setPages(pagesRes.entry.data);
        }
        if (blocksRes.entry && Array.isArray(blocksRes.entry.data)) {
          setBlocks(blocksRes.entry.data);
        }
      } catch (error) {
        toast.error("Nao foi possivel carregar o conteudo. A usar dados locais.");
      } finally {
        setLoadingContent(false);
      }
    }

    loadContent();
  }, []);

  async function saveContentSection(tab: TabKey) {
    setSavingTab(tab);
    try {
      if (tab === "sliders") {
        await api.put(`/content/${CONTENT_KEYS.sliders}`, { data: sliders });
      }
      if (tab === "banners") {
        await api.put(`/content/${CONTENT_KEYS.banners}`, { data: banners });
      }
      if (tab === "paginas") {
        await api.put(`/content/${CONTENT_KEYS.pages}`, { data: pages });
      }
      if (tab === "blocos") {
        await api.put(`/content/${CONTENT_KEYS.blocks}`, { data: blocks });
      }
      toast.success("Conteudo guardado com sucesso.");
    } catch (error) {
      toast.error("Falha ao guardar conteudo.");
    } finally {
      setSavingTab(null);
    }
  }

  function createSlider() {
    if (!sliderForm.title.trim() || !sliderForm.image.trim()) return;
    const next: SliderItem = {
      id: `SL${String(Date.now()).slice(-5)}`,
      ...sliderForm,
      order: Number(sliderForm.order) || 1,
    };
    setSliders((prev) => [...prev, next].sort((a, b) => a.order - b.order));
    setSliderForm({ title: "", subtitle: "", ctaText: "", ctaLink: "", image: "", order: 1, active: true });
  }

  function toggleSlider(id: string) {
    setSliders((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  }

  function toggleBanner(id: string) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  }

  function togglePageStatus(id: string) {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "published" ? "draft" : "published", updatedAt: "Agora" }
          : p
      )
    );
  }

  function toggleFooterPage(id: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, showInFooter: !p.showInFooter, updatedAt: "Agora" } : p)));
  }

  function toggleBlock(id: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled, updatedAt: "Agora" } : b)));
  }

  return (
    <div className="space-y-6">
      {loadingContent && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-sm px-4 py-3">
          A carregar conteudo guardado no backend...
        </div>
      )}

      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conteúdo</h1>
          <p className="text-gray-500 text-sm">Gestão de sliders da home, banners promocionais e páginas institucionais.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatCard label="Sliders activos" value={stats.slidersAtivos} />
          <StatCard label="Banners activos" value={stats.bannersAtivos} />
          <StatCard label="Páginas publicadas" value={stats.paginasPublicadas} />
          <StatCard label="Blocos activos" value={stats.blocosAtivos} />
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm inline-flex gap-2 overflow-x-auto">
        <TabButton label="Sliders Home" active={activeTab === "sliders"} onClick={() => setActiveTab("sliders")} />
        <TabButton label="Banners" active={activeTab === "banners"} onClick={() => setActiveTab("banners")} />
        <TabButton label="Páginas" active={activeTab === "paginas"} onClick={() => setActiveTab("paginas")} />
        <TabButton label="Blocos Home" active={activeTab === "blocos"} onClick={() => setActiveTab("blocos")} />
      </div>

      {activeTab === "sliders" && (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Slider principal da Home</h2>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400">Ordem menor aparece primeiro</p>
                <button
                  onClick={() => saveContentSection("sliders")}
                  disabled={savingTab === "sliders"}
                  className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-60"
                >
                  {savingTab === "sliders" ? "A guardar..." : "Guardar"}
                </button>
              </div>
            </div>
            {sliders.map((slide) => (
              <article key={slide.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <img src={slide.image} alt={slide.title} className="w-full md:w-44 h-24 rounded-lg object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{slide.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{slide.subtitle}</p>
                    <p className="text-xs text-gray-400 mt-1">CTA: {slide.ctaText || "-"} · Link: {slide.ctaLink || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Ordem {slide.order}</span>
                    <button
                      onClick={() => toggleSlider(slide.id)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${slide.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {slide.active ? "Activo" : "Inactivo"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">Novo slide</h3>
            <Field label="Título" value={sliderForm.title} onChange={(value) => setSliderForm((prev) => ({ ...prev, title: value }))} />
            <Field label="Subtítulo" value={sliderForm.subtitle} onChange={(value) => setSliderForm((prev) => ({ ...prev, subtitle: value }))} />
            <Field label="Texto do botão" value={sliderForm.ctaText} onChange={(value) => setSliderForm((prev) => ({ ...prev, ctaText: value }))} />
            <Field label="Link do botão" value={sliderForm.ctaLink} onChange={(value) => setSliderForm((prev) => ({ ...prev, ctaLink: value }))} />
            <Field label="URL da imagem" value={sliderForm.image} onChange={(value) => setSliderForm((prev) => ({ ...prev, image: value }))} />
            <Field
              type="number"
              label="Ordem"
              value={String(sliderForm.order)}
              onChange={(value) => setSliderForm((prev) => ({ ...prev, order: Number(value) || 1 }))}
            />
            <button
              onClick={createSlider}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition"
            >
              Guardar slide
            </button>
          </div>
        </section>
      )}

      {activeTab === "banners" && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Banners promocionais</h2>
            <div className="flex items-center gap-2">
              <button className="text-sm text-orange-500 font-medium">+ Novo banner</button>
              <button
                onClick={() => saveContentSection("banners")}
                disabled={savingTab === "banners"}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-60"
              >
                {savingTab === "banners" ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
                <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {b.image ? <img src={b.image} alt={b.title} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{b.title}</p>
                  <p className="text-xs text-gray-400">Posição: {b.position} · Ordem: {b.order} · Link: {b.link}</p>
                </div>
                <button
                  onClick={() => toggleBanner(b.id)}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${b.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {b.active ? "Activo" : "Inactivo"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "paginas" && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Páginas institucionais</h2>
            <div className="flex items-center gap-2">
              <button className="text-sm text-orange-500 font-medium">+ Nova página</button>
              <button
                onClick={() => saveContentSection("paginas")}
                disabled={savingTab === "paginas"}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-60"
              >
                {savingTab === "paginas" ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{page.title}</p>
                  <p className="text-xs text-gray-400">/{page.slug} · Actualizado: {page.updatedAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFooterPage(page.id)}
                    className={`text-xs px-2 py-1 rounded-full ${page.showInFooter ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}
                  >
                    {page.showInFooter ? "No footer" : "Fora do footer"}
                  </button>
                  <button
                    onClick={() => togglePageStatus(page.id)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${page.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {page.status === "published" ? "Publicado" : "Rascunho"}
                  </button>
                  <button className="text-blue-500 text-xs font-medium">Editar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "blocos" && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Blocos da homepage</h2>
            <button
              onClick={() => saveContentSection("blocos")}
              disabled={savingTab === "blocos"}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-60"
            >
              {savingTab === "blocos" ? "A guardar..." : "Guardar"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blocks.map((block) => (
              <article key={block.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-gray-800">{block.name}</h3>
                  <button
                    onClick={() => toggleBlock(block.id)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${block.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {block.enabled ? "Activo" : "Inactivo"}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">{block.description}</p>
                <p className="text-xs text-gray-400 mt-2">Última alteração: {block.updatedAt}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-3 py-2 min-w-28 text-right">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-800 leading-tight">{value}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${active ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
      />
    </label>
  );
}