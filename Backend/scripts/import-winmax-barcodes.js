/**
 * Importa códigos de barras de uma exportação de artigos do Winmax (CSV ";")
 * para winmax_articles.barcode. A API do Winmax não devolve o código de
 * barras, por isso esta é a única fonte.
 *
 * Uso (na pasta Backend):  node scripts/import-winmax-barcodes.js caminho/Articles.CSV
 * Usa o DATABASE_URL do .env. Só atualiza artigos que já existam (sincronizados).
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { Client } = require('pg');

const ficheiro = process.argv[2];
if (!ficheiro) {
  console.error('Indique o ficheiro CSV exportado do Winmax.');
  process.exit(1);
}

// O Winmax exporta em Windows-1252 com "sep=;" na primeira linha
const bruto = fs.readFileSync(ficheiro);
const texto = new TextDecoder('windows-1252').decode(bruto);
const linhas = texto.split(/\r?\n/).filter((l) => l && !l.startsWith('sep='));
const cab = linhas[0].split(';');
const iCod = cab.indexOf('Code');
const iBar = cab.indexOf('BarCode');
if (iCod < 0 || iBar < 0) {
  console.error('CSV sem as colunas Code e BarCode.');
  process.exit(1);
}

const pares = linhas
  .slice(1)
  .map((l) => l.split(';'))
  .map((c) => [c[iCod]?.trim(), c[iBar]?.trim()])
  .filter(([cod, bar]) => cod && bar);

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  let atualizados = 0;
  for (const [cod, bar] of pares) {
    const r = await db.query('update winmax_articles set barcode = $1 where code = $2', [bar, cod]);
    atualizados += r.rowCount;
  }
  await db.end();
  console.log(`Linhas com código de barras: ${pares.length} | artigos atualizados: ${atualizados}`);
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
