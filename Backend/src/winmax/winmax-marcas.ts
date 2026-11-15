/** Reconhecimento de marca, modelo e EAN a partir dos dados do Winmax. */

/** Marcas reconhecidas no nome do artigo → nome da marca no Icecat. */
export const MARCAS: [RegExp, string][] = [
  [/^hpe$/i, 'HPE'],
  [/^hp$/i, 'HP'],
  [/^dell$/i, 'DELL'],
  [/^lenovo$/i, 'Lenovo'],
  [/^(logitech|longitech)$/i, 'Logitech'],
  [/^(tp-?link|omada)$/i, 'TP-Link'],
  [/^d-?link$/i, 'D-Link'],
  [/^cisco$/i, 'Cisco'],
  [/^(ubiquiti|unifi)$/i, 'Ubiquiti'],
  [/^kingston$/i, 'Kingston Technology'],
  [/^samsung$/i, 'Samsung'],
  [/^wd$/i, 'Western Digital'],
  [/^toshiba$/i, 'Toshiba'],
  [/^genius$/i, 'Genius'],
  [/^manhattan$/i, 'Manhattan'],
  [/^ewent$/i, 'Ewent'],
  [/^apc$/i, 'APC'],
  [/^fortinet$/i, 'Fortinet'],
  [/^fellowes$/i, 'Fellowes'],
  [/^ngs$/i, 'NGS'],
  [/^epson$/i, 'Epson'],
  [/^canon$/i, 'Canon'],
  [/^brother$/i, 'Brother'],
  [/^asus$/i, 'ASUS'],
  [/^acer$/i, 'Acer'],
  [/^apple$/i, 'Apple'],
  [/^xiaomi$/i, 'Xiaomi'],
  [/^huawei$/i, 'Huawei'],
  [/^(hikvision|hikivision)$/i, 'Hikvision'],
  [/^sandisk$/i, 'SanDisk'],
  [/^seagate$/i, 'Seagate'],
  [/^aruba$/i, 'Aruba'],
  [/^jbl$/i, 'JBL'],
  [/^sony$/i, 'Sony'],
  [/^lg$/i, 'LG'],
  [/^philips$/i, 'Philips'],
  [/^intel$/i, 'Intel'],
  [/^microsoft$/i, 'Microsoft'],
  [/^mercusys$/i, 'Mercusys'],
  [/^tenda$/i, 'Tenda'],
  [/^netgear$/i, 'Netgear'],
  [/^mikrotik$/i, 'MikroTik'],
  [/^kyocera$/i, 'KYOCERA'],
  [/^xerox$/i, 'Xerox'],
  [/^lexmark$/i, 'Lexmark'],
  [/^grandstream$/i, 'Grandstream'],
  [/^yealink$/i, 'Yealink'],
  [/^blackview$/i, 'Blackview'],
];

/** Tokens que nunca são código de modelo (medidas, interfaces, cores…). */
const NAO_MODELO = [
  /^\d+([.,]\d+)?(gb|tb|mb|w|hz|mhz|ghz|mt|m|v|mah|p|kc|u|cm|mm|"|')?$/i,
  /^\d+x\d+$/i,
  /^ddr\d/i,
  /^i[3579]$/i,
  /^cat\s?\d/i,
  /^usb/i,
  /^w1[01]/i,
  /^(ax|ac)\d{3,4}$/i,
  /^\d+port$/i,
  /^g\d$/i, // geração isolada (G8): a série sozinha não identifica o produto
];

export function gtinValido(v: string | null | undefined): v is string {
  if (!v || !/^(\d{8}|\d{12,14})$/.test(v)) return false;
  const d = v.split('').map(Number);
  const controlo = d.pop()!;
  const soma = d
    .reverse()
    .reduce((t, x, i) => t + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === controlo;
}

/** Marca e candidatos a código de fabricante a partir do nome do artigo. */
export function marcaEModelos(
  designacao: string,
): { marca: string; modelos: string[] } | null {
  const tokens = designacao.replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
  const i = tokens.findIndex((t) => MARCAS.some(([re]) => re.test(t)));
  if (i < 0) return null;
  const marca = MARCAS.find(([re]) => re.test(tokens[i]))![1];
  const modelos = tokens
    .slice(i + 1)
    .filter((t) => /\d/.test(t) && /[a-z]/i.test(t) && t.length >= 3)
    .filter((t) => !NAO_MODELO.some((re) => re.test(t)))
    .slice(0, 3);
  return modelos.length ? { marca, modelos } : null;
}

/** Marca reconhecida no nome do artigo (nome usado no Icecat), ou null. */
export function marcaDoNome(designacao: string): string | null {
  const tokens = designacao.replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const m = MARCAS.find(([re]) => re.test(t));
    if (m) return m[1];
  }
  return null;
}
