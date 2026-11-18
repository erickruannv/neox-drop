# NEOX drop — Pacote oficial de referências para o repositório

**Versão:** V1.1, 18/11/2026. **Origem:** planejamento aprovado nesta conversa.

Este diretório contém fontes **de referência**, não a implementação executável.

## Por onde começar

- [Especificação completa V1.1](NEOX_drop_Documentacao_Completa_V1_1.md)
- [Arquivos organizados V1.1](especificacao-v1.1/README.md)
- [Contratos de API V1.1](especificacao-v1.1/docs/04-contratos-api.md)
- [Modelagem dos três bancos](especificacao-v1.1/docs/03-modelagem-bancos.md)
- [Diagramas](especificacao-v1.1/docs/diagramas/README.md)
- [Identidade e UX/UI](especificacao-v1.1/docs/05-identidade-ux-ui.md)
- [Mockup de homepage aprovado](visual/04-homepage-aprovada.png)
- [Marca visual principal aprovada](visual/01-identidade-principal-preferida.png)
- [Notas sobre assets](visual/README.md)

## Ordem e cautelas

1. Preservar os arquivos de configuração atuais no diretório raiz do projeto (`AGENTS.md`, `.claude/`, `.agents/`, `.specify/`, hooks, configurações locais etc.). Os arquivos `AGENTS.md` e `CLAUDE.md` **dentro desta pasta de referência** são históricos de documentação e NÃO devem sobrescrever os arquivos ativos do projeto.
2. Revisar a V1.1 em conjunto com as regras atuais do repositório. Em caso de divergência, relatar para decisão antes de implementar; não misturar contratos silenciosamente.
3. Não executar automaticamente as migrations ou scripts: são projetos de esquemas, não evidência de bancos provisionados.
4. Não há modelo 3D GLB pronto; há apenas definição funcional e referências visuais. Para girar o tênis de verdade, obter geometria 3D licenciada e testar Model Viewer com **apenas rotação horizontal do objeto em torno do eixo vertical Y** (sem inclinação de câmera).
5. As imagens deste pacote são referências/mockups, não necessariamente ativos publicáveis ou imagens com licença comprovada para o produto final. Evitar copiar marcas de terceiros e falsas afirmações comerciais.
6. Critérios da avaliação: Supabase para login/admin, MongoDB para produtos, Redis para recentes, carrinho e link WhatsApp; vídeo de 5–10 min e repositório com instruções.

## Estado

**Documentação pronta para revisão**; backend, frontend, contas externas, deploy e testes de integração ainda não foram comprovados por estes materiais.
