# CLAUDE.md — Guia do Claude Code (NEOX drop)

Siga obrigatoriamente `AGENTS.md` e os documentos de `docs/`. **Não reinvente a stack:** a aplicação é **Python + FastAPI + Jinja2**, com JS apenas para interatividade.

## Seu foco
- Transformar o mockup aprovado em componentes Jinja2 + Tailwind CSS.
- Identidade NEOX drop: `NEOX` dominante, itálico esportivo, `drop` coral, cabeçalho preto, off-white, verde-lima em interações e cards Street/Classics/Performance.
- Home editorial, catálogo, produto, carrinho e painel. Contrato com backend em `docs/04-contratos-api.md`.
- Hero 3D: carregar um GLB real licenciado, camera-orbit com ângulo polar fixo, azimute livre, arraste horizontal, auto-rotação lenta, `prefers-reduced-motion`, poster/fallback. Trocar nome, preço, modelo e fundo em uma transição sincronizada.
- Responsividade, foco visível, labels, feedback de erro/loading.

## Restrições
- Não criar backend Node/Next.js paralelo, nem prometer frete, parcelamento ou pagamento real.
- Não modificar serviços Python/SQL/Mongo/Redis sem alinhamento com Codex.
- Não copiar logos ou imagens de outros sites sem licença.
- Trabalhar em branch/worktree próprio. Testes visuais com dados fictícios até contrato real estar disponível.

## Ferramentas opcionais
UI UX Pro Max pode ajudar a sistematizar o design. Serena ajuda a navegar códigos; Superpowers em implementação disciplinada; Spec Kit só como apoio às especificações já fixadas. Qualquer instalação/hook/MCP deve ser previamente revisado.

## Entrega de cada tarefa
Resumo, arquivos, screenshots ou passos reprodutíveis de teste, bugs conhecidos e próximos passos. Não indicar sistema funcional antes de testar contra backend real.
