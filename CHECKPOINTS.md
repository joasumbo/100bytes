# Checkpoint rapido de Git

Para evitar perda de trabalho, use este comando sempre apos concluir uma funcionalidade:

```powershell
pwsh -File scripts/checkpoint-all.ps1
```

Opcionalmente, pode informar uma mensagem especifica:

```powershell
pwsh -File scripts/checkpoint-all.ps1 -Message "feat(frontend): filtro por marca na categoria"
```

## O que o script faz

- Verifica os repositorios: root, admin, Backend e frontend.
- Se houver alteracoes: faz `add -A` e `commit`.
- Se houver `origin`: faz push para a branch atual.
- Exibe um resumo final com hash de cada repo.

## Regra operacional

- 1 funcionalidade concluida = 1 checkpoint.
- Nao acumular muitas funcionalidades sem push.
