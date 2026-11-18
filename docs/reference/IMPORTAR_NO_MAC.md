# Importação para o Mac (NeoxDrop)

1. Baixe `NEOX_drop_Referencias_Para_VSCode.zip` nesta conversa, normalmente para `~/Downloads`.
2. No terminal do macOS, dentro do projeto:

```bash
cd /Users/dg/Documents/NeoxDrop
unzip -n ~/Downloads/NEOX_drop_Referencias_Para_VSCode.zip -d .
```

3. Confira:

```bash
ls docs/reference
ls docs/reference/visual
ls docs/reference/especificacao-v1.1/docs/diagramas
```

O parâmetro `-n` impede substituir arquivos existentes. O ZIP contém somente `docs/reference/...`, portanto não mexe em `.specify`, `.claude`, `.agents`, `AGENTS.md` nem `CLAUDE.md` na raiz. Não use `sudo`.

4. Peça ao Codex que leia `docs/reference/README.md`, `docs/reference/especificacao-v1.1/docs/04-contratos-api.md` e `docs/reference/especificacao-v1.1/docs/05-identidade-ux-ui.md`; ele deve revisar a consistência antes de criar tarefas.
5. Só então atualizar a constituição do Spec Kit e definir contratos; após revisão, criar primeiro commit dessa importação (não publicar segredos).
