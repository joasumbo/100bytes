import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XMLParser } from 'fast-xml-parser';

/**
 * Cliente dos web services do Winmax4 (SOAP, endpoint generic.asmx).
 *
 * Cada método do Winmax recebe CompanyCode + UserLogin + UserPassword e um XML
 * de pedido (em string) validado pelo XSD correspondente. A resposta é outro
 * XML em string, com <Code> (0 = OK) e <Message>.
 *
 * Atenção: o elemento raiz do pedido começa por "Winmax4" com W maiúsculo
 * (ex.: Winmax4ArticlesRQ). Os exemplos do manual v1.31 usam minúscula e o
 * servidor rejeita-os com "Invalid root element".
 */

export class WinmaxError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(`Winmax ${code}: ${message}`);
  }
}

/** Elementos que podem repetir-se e devem vir sempre como lista. */
const LISTAS = new Set([
  'Article',
  'Price',
  'Stock',
  'Family',
  'SubFamily',
  'SubSubFamily',
  'SubSubSubFamily',
  'Warehouse',
  'TerminalConfiguration',
]);

export type WinmaxPage<T> = { items: T[]; totalPages: number };

@Injectable()
export class WinmaxClient {
  private readonly parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false, // códigos como "01040102004" têm de ficar texto
    trimValues: true,
    htmlEntities: true,
    isArray: (name) => LISTAS.has(name),
  });

  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    return Boolean(
      this.config.get('WINMAX_URL') &&
      this.config.get('WINMAX_COMPANY_CODE') &&
      this.config.get('WINMAX_USER') &&
      this.config.get('WINMAX_PASSWORD'),
    );
  }

  // ─── Métodos do Winmax ───────────────────────────────────────────────────

  /** Artigos com preços e stocks, uma página de cada vez (máx. efetivo: 50). */
  async getArticles(opts: {
    page: number;
    pageSize?: number;
    changedAfter?: Date;
  }): Promise<WinmaxPage<any>> {
    const filtro = [
      opts.changedAfter
        ? `<LastChangeDateAfter>${dataWinmax(opts.changedAfter)}</LastChangeDateAfter>`
        : '',
      `<PageSize>${opts.pageSize ?? 50}</PageSize>`,
      `<PageNumber>${opts.page}</PageNumber>`,
    ].join('');
    const r = await this.call(
      'GetArticles',
      'Winmax4ArticleRQXML',
      pedido(
        'Winmax4ArticlesRQ',
        `<GetPrices /><GetStocks /><Filter>${filtro}</Filter>`,
      ),
    );
    return {
      items: r.Articles?.Article ?? [],
      totalPages: Number(r.Filter?.TotalPages ?? 0),
    };
  }

  /** Árvore de famílias (com sub, sub-sub e sub-sub-sub famílias). */
  async getFamilies(page = 1): Promise<WinmaxPage<any>> {
    const r = await this.call(
      'GetFamilies',
      'Winmax4GetFamiliesRQXML',
      pedido(
        'Winmax4GetFamiliesRQ',
        `<GetSubFamilies /><Filter><PageNumber>${page}</PageNumber></Filter>`,
      ),
    );
    return {
      items: r.Families?.Family ?? [],
      totalPages: Number(r.Filter?.TotalPages ?? 1),
    };
  }

  async getWarehouses(): Promise<{ code: number; name: string }[]> {
    const r = await this.call(
      'GetWarehouses',
      'Winmax4GetWarehousesRQXML',
      pedido('Winmax4GetWarehousesRQ', ''),
    );
    return (r.Warehouses?.Warehouse ?? []).map((w: any) => ({
      code: Number(w.Code),
      name: String(w.Designation ?? ''),
    }));
  }

  async getTerminals(): Promise<{ code: number; name: string }[]> {
    const r = await this.call(
      'GetTerminalConfigurations',
      'Winmax4GetTerminalConfigurationsRQXML',
      pedido('Winmax4GetTerminalConfigurationsRQ', ''),
    );
    return (r.TerminalConfigurations?.TerminalConfiguration ?? []).map(
      (t: any) => ({
        code: Number(t.Code),
        name: String(t.Designation ?? ''),
      }),
    );
  }

  // ─── Transporte SOAP ─────────────────────────────────────────────────────

  private async call(
    metodo: string,
    param: string,
    rqXml: string,
  ): Promise<any> {
    if (!this.configured)
      throw new WinmaxError(
        -1,
        'Credenciais do Winmax não configuradas (WINMAX_* no .env).',
      );

    const envelope =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
      `<${metodo} xmlns="winmax4">` +
      `<CompanyCode>${esc(this.config.get('WINMAX_COMPANY_CODE')!)}</CompanyCode>` +
      `<UserLogin>${esc(this.config.get('WINMAX_USER')!)}</UserLogin>` +
      `<UserPassword>${esc(this.config.get('WINMAX_PASSWORD')!)}</UserPassword>` +
      `<${param}>${esc(rqXml)}</${param}>` +
      `</${metodo}></soap:Body></soap:Envelope>`;

    const res = await fetch(this.config.get<string>('WINMAX_URL')!, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"winmax4/${metodo}"`,
      },
      body: envelope,
      signal: AbortSignal.timeout(90_000),
    });
    const texto = await res.text();
    if (!res.ok)
      throw new WinmaxError(-res.status, `HTTP ${res.status} em ${metodo}`);

    // 1.º nível: envelope SOAP → string com o XML de resposta
    const soap = this.parser.parse(texto);
    const interno =
      soap?.Envelope?.Body?.[`${metodo}Response`]?.[`${metodo}Result`];
    if (typeof interno !== 'string')
      throw new WinmaxError(-2, `Resposta inesperada em ${metodo}`);

    // 2.º nível: o XML de resposta propriamente dito
    const doc = this.parser.parse(interno);
    const raiz =
      doc[`${metodo}Result`] ??
      doc[Object.keys(doc).find((k) => k !== '?xml')!];
    const code = Number(raiz?.Code ?? -3);
    if (code !== 0)
      throw new WinmaxError(code, String(raiz?.Message || 'Erro desconhecido'));
    return raiz;
  }
}

function pedido(raiz: string, corpo: string) {
  return `<?xml version='1.0' encoding='utf-8'?><x:${raiz} xmlns:x="urn:${raiz}">${corpo}</x:${raiz}>`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** yyyy-MM-ddTHH:mm:ss na hora de Luanda (UTC+1, sem horário de verão). */
function dataWinmax(d: Date) {
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString().slice(0, 19);
}
