/**
 * Seed: cria as 2 lojas 100bytes e associa todos os produtos existentes a ambas.
 * Execução: node prisma/seed-stores.js
 */

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Criar lojas
  const stores = await Promise.all([
    prisma.store.upsert({
      where: { id: 'store-liga-africana' },
      create: {
        id: 'store-liga-africana',
        name: 'Loja 100bytes Liga Africana',
        address: 'R. da Liga Nacional Africana 81, Luanda',
        phone: '928499325',
        lat: -8.8212336,
        lng: 13.2444817,
        active: true,
      },
      update: {
        name: 'Loja 100bytes Liga Africana',
        address: 'R. da Liga Nacional Africana 81, Luanda',
        phone: '928499325',
        lat: -8.8212336,
        lng: 13.2444817,
        active: true,
      },
    }),
    prisma.store.upsert({
      where: { id: 'store-maianga' },
      create: {
        id: 'store-maianga',
        name: 'Loja 100bytes Maianga',
        address: 'R. António Américo Lencastre 11, Luanda',
        phone: '946920849',
        lat: -8.8240416,
        lng: 13.2329354,
        active: true,
      },
      update: {
        name: 'Loja 100bytes Maianga',
        address: 'R. António Américo Lencastre 11, Luanda',
        phone: '946920849',
        lat: -8.8240416,
        lng: 13.2329354,
        active: true,
      },
    }),
  ]);

  console.log('✅ Lojas criadas:', stores.map(s => s.name));

  // 2. Buscar todos os produtos
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  console.log(`📦 ${products.length} produtos encontrados`);

  // 3. Associar cada produto às 2 lojas com quantidade 10
  for (const product of products) {
    for (const store of stores) {
      await prisma.storeStock.upsert({
        where: { productId_storeId: { productId: product.id, storeId: store.id } },
        create: { productId: product.id, storeId: store.id, quantity: 10 },
        update: { quantity: 10 },
      });
    }
    console.log(`  ↳ ${product.name}`);
  }

  console.log('✅ Stock associado com sucesso!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
