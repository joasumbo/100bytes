# 100bytes — Frontend (Loja)

Servidor Express servindo o HTML estatico do template Electro.

## Estrutura

```
frontend/
├── server.js          # Express estatico (porta 3000)
├── package.json
└── public/
    ├── index.html     # Home v1 (copiada do template)
    └── assets/        # CSS, JS, fontes, imagens
```

## Como rodar

```powershell
cd frontend
npm install
npm run dev
```

Abra: http://localhost:3000

## URLs

URLs limpas (sem `.html`): `/cart` resolve para `/cart.html` automaticamente.

## Adicionar novas paginas

Copie do `TEMPLATE/2.0/html/` para `frontend/public/` e personalize.

```powershell
Copy-Item ../TEMPLATE/2.0/html/shop/shop-v1.html public/shop.html
```
