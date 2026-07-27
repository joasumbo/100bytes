// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const mockStats = {
  revenueToday: 1_240_000,
  revenueMonth: 28_500_000,
  revenueYear: 187_300_000,
  ordersTotal: 1_847,
  ordersPending: 34,
  ordersShipped: 12,
  conversionRate: 3.7,
  avgTicket: 185_000,
  newCustomers: 23,
  criticalStock: 7,
};

export const mockSalesChart = [
  { month: "Jan", vendas: 12_400_000 },
  { month: "Fev", vendas: 15_200_000 },
  { month: "Mar", vendas: 18_900_000 },
  { month: "Abr", vendas: 14_100_000 },
  { month: "Mai", vendas: 22_300_000 },
  { month: "Jun", vendas: 19_800_000 },
  { month: "Jul", vendas: 25_100_000 },
  { month: "Ago", vendas: 21_500_000 },
  { month: "Set", vendas: 28_700_000 },
  { month: "Out", vendas: 24_300_000 },
  { month: "Nov", vendas: 31_200_000 },
  { month: "Dez", vendas: 28_500_000 },
];

export const mockTrafficChart = [
  { day: "Seg", visitas: 320, compras: 12 },
  { day: "Ter", visitas: 410, compras: 18 },
  { day: "Qua", visitas: 380, compras: 14 },
  { day: "Qui", visitas: 520, compras: 23 },
  { day: "Sex", visitas: 680, compras: 31 },
  { day: "Sáb", visitas: 750, compras: 28 },
  { day: "Dom", visitas: 290, compras: 9 },
];

export const mockProducts = [
  { id: "P001", name: "Computador Portátil 250R G10 15.6\"", sku: "CP-250R-G10", category: "Portáteis", brand: "HP", price: 740_333, promo: null, stock: 8, status: "active", images: ["https://ncrangola.vtexassets.com/arquivos/ids/174437/Computador-.jpg?v=639059891359100000"] },
  { id: "P002", name: "Microsoft Office 365 Personal", sku: "MS-OFF365-P", category: "Software", brand: "Microsoft", price: 83_227, promo: 75_000, stock: 50, status: "active", images: ["https://ncrangola.vtexassets.com/arquivos/ids/170438/Office.jpg?v=638858485735500000"] },
  { id: "P003", name: "Antivirus VPN Standard", sku: "AV-VPN-STD", category: "Software", brand: "Norton", price: 19_152, promo: null, stock: 2, status: "low_stock", images: ["https://ncrangola.vtexassets.com/arquivos/ids/175294/Antivirus-.jpg?v=639062242634230000"] },
  { id: "P004", name: "Bolsa Portátil 15.6\" Acolchoada", sku: "BOLSA-156", category: "Acessórios", brand: "HP", price: 19_904, promo: null, stock: 15, status: "active", images: ["https://ncrangola.vtexassets.com/arquivos/ids/156008/1E7D7AA.jpg?v=638676081536500000"] },
  { id: "P005", name: "Computador Portátil 660 G11 16\"", sku: "CP-660-G11", category: "Portáteis", brand: "HP", price: 1_645_983, promo: null, stock: 0, status: "out_of_stock", images: [] },
  { id: "P006", name: "ZBook G11 16\" Workstation", sku: "ZBOOK-G11", category: "Workstations", brand: "HP", price: 2_467_776, promo: 2_200_000, stock: 3, status: "low_stock", images: [] },
  { id: "P007", name: "Smartwatch Series 8 GPS", sku: "SW-S8-GPS", category: "Wearables", brand: "Apple", price: 380_000, promo: 340_000, stock: 12, status: "active", images: [] },
  { id: "P008", name: "Teclado Mecânico RGB", sku: "TEC-MEC-RGB", category: "Periféricos", brand: "Logitech", price: 45_000, promo: null, stock: 0, status: "out_of_stock", images: [] },
];

export const mockCategories = [
  { id: "C001", name: "Portáteis", slug: "portateis", parent: null, products: 45, active: true },
  { id: "C002", name: "Workstations", slug: "workstations", parent: "Portáteis", products: 12, active: true },
  { id: "C003", name: "Software", slug: "software", parent: null, products: 38, active: true },
  { id: "C004", name: "Acessórios", slug: "acessorios", parent: null, products: 67, active: true },
  { id: "C005", name: "Periféricos", slug: "perifericos", parent: "Acessórios", products: 29, active: true },
  { id: "C006", name: "Wearables", slug: "wearables", parent: null, products: 8, active: false },
  { id: "C007", name: "Impressoras", slug: "impressoras", parent: null, products: 14, active: true },
];

export const mockOrders = [
  { id: "ORD-001", customer: "João Sebastião", email: "joao@email.com", phone: "+244 923 456 789", total: 860_237, status: "pending", payment: "multicaixa", items: 2, date: "2026-05-10T09:23:00", address: "Rua da Missão, 45, Luanda" },
  { id: "ORD-002", customer: "Maria Fernanda", email: "maria@email.com", phone: "+244 912 345 678", total: 1_645_983, status: "paid", payment: "transferencia", items: 1, date: "2026-05-10T08:10:00", address: "Av. 4 de Fevereiro, Luanda" },
  { id: "ORD-003", customer: "Carlos Mendes", email: "carlos@email.com", phone: "+244 934 567 890", total: 122_283, status: "shipped", payment: "referencia", items: 3, date: "2026-05-09T15:45:00", address: "Bairro Miramar, Luanda" },
  { id: "ORD-004", customer: "Ana Paula Silva", email: "ana@email.com", phone: "+244 945 678 901", total: 380_000, status: "delivered", payment: "cartao", items: 1, date: "2026-05-09T11:20:00", address: "Talatona, Luanda Sul" },
  { id: "ORD-005", customer: "Pedro Lopes", email: "pedro@email.com", phone: "+244 956 789 012", total: 45_000, status: "cancelled", payment: "multicaixa", items: 1, date: "2026-05-08T17:30:00", address: "Viana, Luanda" },
  { id: "ORD-006", customer: "Sofia Neto", email: "sofia@email.com", phone: "+244 967 890 123", total: 2_200_000, status: "pending", payment: "transferencia", items: 1, date: "2026-05-08T14:00:00", address: "Miramar, Luanda" },
  { id: "ORD-007", customer: "Rui Ferreira", email: "rui@email.com", phone: "+244 978 901 234", total: 503_227, status: "paid", payment: "referencia", items: 2, date: "2026-05-07T10:15:00", address: "Ingombota, Luanda" },
];

export const mockCustomers = [
  { id: "CL001", name: "João Sebastião", email: "joao@email.com", phone: "+244 923 456 789", orders: 5, totalSpent: 3_240_000, status: "active", joined: "2025-03-12", vip: true },
  { id: "CL002", name: "Maria Fernanda", email: "maria@email.com", phone: "+244 912 345 678", orders: 12, totalSpent: 8_750_000, status: "active", joined: "2024-11-05", vip: true },
  { id: "CL003", name: "Carlos Mendes", email: "carlos@email.com", phone: "+244 934 567 890", orders: 2, totalSpent: 167_283, status: "active", joined: "2026-01-20", vip: false },
  { id: "CL004", name: "Ana Paula Silva", email: "ana@email.com", phone: "+244 945 678 901", orders: 8, totalSpent: 2_380_000, status: "active", joined: "2025-07-14", vip: false },
  { id: "CL005", name: "Pedro Lopes", email: "pedro@email.com", phone: "+244 956 789 012", orders: 1, totalSpent: 45_000, status: "blocked", joined: "2026-04-01", vip: false },
  { id: "CL006", name: "Sofia Neto", email: "sofia@email.com", phone: "+244 967 890 123", orders: 3, totalSpent: 2_780_000, status: "active", joined: "2025-09-30", vip: true },
];

export const mockPayments = [
  { id: "PAY-001", order: "ORD-002", customer: "Maria Fernanda", method: "Transferência", amount: 1_645_983, status: "confirmed", txId: "TXN-8847291", date: "2026-05-10T08:30:00" },
  { id: "PAY-002", order: "ORD-003", customer: "Carlos Mendes", method: "Referência", amount: 122_283, status: "confirmed", txId: "REF-2938847", date: "2026-05-09T16:00:00" },
  { id: "PAY-003", order: "ORD-004", customer: "Ana Paula Silva", method: "Cartão", amount: 380_000, status: "confirmed", txId: "CRD-9918273", date: "2026-05-09T11:45:00" },
  { id: "PAY-004", order: "ORD-001", customer: "João Sebastião", method: "Multicaixa", amount: 860_237, status: "pending", txId: "MCX-1122334", date: "2026-05-10T09:23:00" },
  { id: "PAY-005", order: "ORD-005", customer: "Pedro Lopes", method: "Multicaixa", amount: 45_000, status: "failed", txId: "MCX-5544332", date: "2026-05-08T17:30:00" },
  { id: "PAY-006", order: "ORD-007", customer: "Rui Ferreira", method: "Referência", amount: 503_227, status: "confirmed", txId: "REF-7766554", date: "2026-05-07T10:30:00" },
];

export const mockBanners = [
  { id: "BN001", title: "Promoção HP Portáteis", position: "hero", image: "https://cdn.100bytes.co.ao/logo/logo-1752749442.jpg", link: "/produtos/portateis", active: true, order: 1 },
  { id: "BN002", title: "Software Microsoft", position: "hero", image: "https://ncrangola.vtexassets.com/arquivos/ids/170438/Office.jpg?v=638858485735500000", link: "/produtos/software", active: true, order: 2 },
  { id: "BN003", title: "Acessórios em Destaque", position: "sidebar", image: "", link: "/produtos/acessorios", active: false, order: 1 },
];

export const mockNotifications = [
  { id: "N001", type: "order", message: "Novo pedido ORD-001 de João Sebastião (860.237 Kz)", read: false, date: "2026-05-10T09:23:00" },
  { id: "N002", type: "stock", message: "Stock crítico: Antivirus VPN Standard — apenas 2 unidades", read: false, date: "2026-05-10T08:00:00" },
  { id: "N003", type: "payment", message: "Pagamento confirmado: ORD-002 de Maria Fernanda", read: true, date: "2026-05-10T08:30:00" },
  { id: "N004", type: "stock", message: "Stock esgotado: Computador Portátil 660 G11", read: false, date: "2026-05-09T20:00:00" },
  { id: "N005", type: "order", message: "Pedido ORD-005 cancelado por Pedro Lopes", read: true, date: "2026-05-08T17:30:00" },
];

export const mockTopProducts = [
  { name: "Portátil 250R G10", vendas: 34, receita: 25_171_322 },
  { name: "Office 365 Personal", vendas: 28, receita: 2_330_352 },
  { name: "ZBook G11 16\"", vendas: 9, receita: 22_209_984 },
  { name: "Bolsa 15.6\"", vendas: 22, receita: 437_888 },
  { name: "Antivirus VPN", vendas: 17, receita: 325_584 },
];

export const mockAdminUsers = [
  { id: "ADM001", name: "Superadmin", email: "admin@100bytes.co.ao", role: "superadmin", active: true, lastLogin: "2026-05-10T09:00:00" },
  { id: "ADM002", name: "Gestor Loja", email: "gestor@100bytes.co.ao", role: "manager", active: true, lastLogin: "2026-05-09T14:30:00" },
  { id: "ADM003", name: "Suporte Cliente", email: "suporte@100bytes.co.ao", role: "support", active: true, lastLogin: "2026-05-10T08:45:00" },
  { id: "ADM004", name: "Marketing", email: "marketing@100bytes.co.ao", role: "marketing", active: false, lastLogin: "2026-04-28T11:00:00" },
];

export const mockDeliveryZones = [
  { id: "DZ001", name: "Luanda Centro", cost: 0, days: "1-2", active: true },
  { id: "DZ002", name: "Luanda Arredores", cost: 2_000, days: "1-3", active: true },
  { id: "DZ003", name: "Benguela", cost: 5_000, days: "3-5", active: true },
  { id: "DZ004", name: "Huambo", cost: 6_000, days: "4-6", active: true },
  { id: "DZ005", name: "Cabinda", cost: 8_000, days: "5-7", active: true },
];

export const mockReturns = [
  { id: "RET001", order: "ORD-003", customer: "Carlos Mendes", product: "Antivirus VPN Standard", reason: "Produto com defeito", status: "pending", date: "2026-05-10T10:00:00" },
  { id: "RET002", order: "ORD-004", customer: "Ana Paula Silva", product: "Smartwatch Series 8", reason: "Não correspondeu às expectativas", status: "approved", date: "2026-05-09T14:00:00" },
];

export const formatKz = (value: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 })
    .format(value)
    .replace("AOA", "Kz");
