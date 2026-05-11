# Guia de Contribuicao

Este projeto usa commits frequentes e descritivos por funcionalidade.

## Regra principal

Sempre que concluir uma funcionalidade (ou bugfix isolado), fazer:

1. Commit bem descrito
2. Push para o GitHub

## Padrao de commit (obrigatorio)

Formato:

```text
<tipo>(<escopo>): <resumo curto>

<o que foi feito>
<impacto>
<observacoes de teste>
```

Tipos recomendados:

- `feat`: nova funcionalidade
- `fix`: correcao de bug
- `refactor`: melhoria sem mudar comportamento
- `docs`: documentacao
- `chore`: tarefas de infraestrutura
- `style`: ajustes visuais/CSS

Exemplos:

```text
feat(frontend): adiciona filtro por marca na categoria
fix(frontend): corrige rota legada /categoria/:slug
docs(root): adiciona README e guia de contribuicao
```

## Checklist antes do commit

- Mudanca compila/roda localmente
- Sem arquivos desnecessarios versionados
- Mensagem de commit explica claramente o objetivo
- Alteracoes relacionadas no mesmo commit (evitar commits mistos)

## Fluxo recomendado

```bash
git add <arquivos>
git commit -m "feat(frontend): ..."
git push origin <branch>
```

## Branching

- `main`: branch principal
- Features novas podem usar branch dedicada (`feat/nome-curto`) ou direto em `main` quando combinado com o time.

## Nota

Evite commits gigantes com varias funcionalidades juntas. O ideal e 1 funcionalidade = 1 commit.
