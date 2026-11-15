"""
Camada Python de recomendações — produtos semelhantes e substitutos.

Lê os produtos ativos do Postgres, representa cada um como texto (nome, marca,
categoria, características do Icecat, descrição) e calcula a semelhança entre
todos com TF-IDF + cosine similarity:
  - palavras (1–2 gramas): significado ("monitor 24 full hd");
  - n-gramas de caracteres (3–5): códigos de modelo (P2425H ~ P2225H).
A pontuação final junta a semelhança do texto com a proximidade de categoria e
de preço. Escreve o resultado na tabela product_relations:
  - similar:    os 12 mais parecidos (qualquer categoria);
  - substitute: alternativas para quando falta stock — mesma categoria (ou
                categoria-mãe), preço até ±40 %, com stock.

Uso:
  python recs/similares.py                 # usa DATABASE_URL (ou Backend/.env)
  python recs/similares.py --dry-run       # só mostra exemplos, não grava

Corre em segundo plano (agendado de hora a hora); a loja nunca espera por isto.
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import psycopg
from dotenv import dotenv_values
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

N_SIMILARES = 12
N_SUBSTITUTOS = 6
FAIXA_PRECO = 0.40  # substitutos: ±40 %
MIN_SUBSTITUTO = 0.12  # semelhança mínima de texto para ser substituto


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9.+ ]+", " ", texto)


def texto_specs(specs) -> str:
    if not isinstance(specs, dict):
        return ""
    partes = []
    for grupo in specs.values():
        if not isinstance(grupo, dict):
            continue
        for nome, valor in grupo.items():
            v = str(valor).strip().lower()
            if v in ("sim",):
                partes.append(str(nome))
            elif v not in ("não", "nao"):
                partes.append(f"{nome} {valor}")
    return " ".join(partes)


def url_bd() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        env = Path(__file__).resolve().parent.parent / "Backend" / ".env"
        url = dotenv_values(env).get("DATABASE_URL") if env.exists() else None
    if not url:
        sys.exit("DATABASE_URL em falta (variável de ambiente ou Backend/.env).")
    return url.split("?")[0]  # o psycopg não aceita ?schema=public


def carregar(conn):
    sql = """
        select p.id, p.name, coalesce(p."salePrice", p."basePrice") as preco,
               p.stock, p."trackStock", coalesce(array_length(p."imageKeys", 1), 0) as fotos,
               b.name as marca, c.id as cat_id, c.name as cat, c."parentId" as cat_pai,
               coalesce(p.description, '') as descricao, i.specs
          from products p
          left join brands b on b.id = p."brandId"
          left join categories c on c.id = p."categoryId"
          left join winmax_article_info i on i."articleCode" = p."winmaxCode"
         where p.active
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        colunas = [d.name for d in cur.description]
        return [dict(zip(colunas, linha)) for linha in cur.fetchall()]


def calcular(produtos):
    n = len(produtos)
    nomes = [normalizar(p["name"]) for p in produtos]
    textos = [
        " ".join(
            [
                nomes[k],
                nomes[k],  # o nome conta a dobrar
                normalizar(p["marca"] or ""),
                normalizar(p["cat"] or ""),
                normalizar(texto_specs(p["specs"])),
                normalizar(p["descricao"][:800]),
            ]
        )
        for k, p in enumerate(produtos)
    ]

    palavras = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True).fit_transform(textos)
    caracteres = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True).fit_transform(nomes)
    matriz = hstack([palavras * 0.65, caracteres * 0.35]).tocsr()
    sim = cosine_similarity(matriz)
    np.fill_diagonal(sim, 0)

    precos = np.array([max(float(p["preco"] or 0), 1.0) for p in produtos])
    com_stock = np.array([(not p["trackStock"]) or (p["stock"] or 0) > 0 for p in produtos])

    similares, substitutos = [], []
    for i, p in enumerate(produtos):
        mesma_cat = np.array([q["cat_id"] is not None and q["cat_id"] == p["cat_id"] for q in produtos])
        mesmo_pai = np.array(
            [p["cat_pai"] is not None and (q["cat_pai"] == p["cat_pai"] or q["cat_id"] == p["cat_pai"]) for q in produtos]
        )
        # proximidade de preço: 1 quando igual, desce com a diferença (escala log)
        prox_preco = np.exp(-np.abs(np.log(precos / precos[i])))
        pontos = sim[i] * (1 + 0.25 * mesma_cat + 0.10 * mesmo_pai) * (0.6 + 0.4 * prox_preco)
        pontos[i] = 0

        for j in np.argsort(-pontos)[:N_SIMILARES]:
            if pontos[j] > 0.02:
                similares.append((p["id"], produtos[j]["id"], "similar", float(round(pontos[j], 5))))

        dentro = np.abs(precos / precos[i] - 1) <= FAIXA_PRECO
        # mesma categoria (ou mãe) com semelhança mínima, ou texto muito parecido noutra categoria
        relacionado = ((mesma_cat | mesmo_pai) & (sim[i] >= MIN_SUBSTITUTO)) | (sim[i] >= 0.35)
        elegiveis = relacionado & dentro & com_stock
        elegiveis[i] = False
        cand = np.where(elegiveis)[0]
        for j in cand[np.argsort(-pontos[cand])][:N_SUBSTITUTOS]:
            substitutos.append((p["id"], produtos[j]["id"], "substitute", float(round(pontos[j], 5))))

    return similares, substitutos


def gravar(conn, linhas):
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute("delete from product_relations where kind in ('similar', 'substitute')")
            cur.executemany(
                'insert into product_relations ("productId", "relatedId", kind, score, "updatedAt") values (%s, %s, %s, %s, now())',
                linhas,
            )


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--dry-run", action="store_true", help="não grava; mostra exemplos")
    args = ap.parse_args()

    t0 = time.time()
    with psycopg.connect(url_bd()) as conn:
        produtos = carregar(conn)
        if len(produtos) < 2:
            print("Produtos insuficientes.")
            return
        similares, substitutos = calcular(produtos)
        nomes = {p["id"]: p["name"] for p in produtos}
        if args.dry_run:
            for pid in [p["id"] for p in produtos[:: max(1, len(produtos) // 6)]][:6]:
                sim = [nomes[r[1]][:34] for r in similares if r[0] == pid][:3]
                sub = [nomes[r[1]][:34] for r in substitutos if r[0] == pid][:3]
                print(f"- {nomes[pid][:40]}\n    semelhantes: {sim}\n    substitutos: {sub}")
        else:
            gravar(conn, similares + substitutos)
    print(
        f"{len(produtos)} produtos · {len(similares)} semelhantes · {len(substitutos)} substitutos"
        f" · {time.time() - t0:.1f} s{' (simulação)' if args.dry_run else ''}"
    )


if __name__ == "__main__":
    main()
