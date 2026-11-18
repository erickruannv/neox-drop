# Feature Specification: NEOX drop V1.1

**Feature**: 001-neox-drop-v11 | **Created**: 2026-11-18 | **Status**: Ready for planning handoff
**Input**: documentação original V1.1 em `docs/reference/`; arquitetura explicitamente Python 3.13.
**Implementation authorization**: nenhuma nesta execução. Não marcar histórias concluídas por haver contrato.

## User Scenarios & Testing

### User Story 1 — Administrador autentica e publica produto (Priority: P0)

Administrador ativo usa Supabase para entrar e cadastrar/editar/desativar produto no MongoDB.
Why this priority: primeira fatia verificável da avaliação, antes do refinamento 3D.
Independent Test: T-01–T-08 e T-21 da referência, com admin ativo, inválido e usuário sem perfil.
Given sessão ausente, when uma API admin é acessada, then 401; usuário válido sem admin ativo: 403.
Given produto válido, when criado, then 201 com id e persistência MongoDB; SKU/slug duplicado: 409.
Given produto recém-criado, when catálogo é consultado, then novo item aparece sem redeploy.

### User Story 2 — Visitante consulta catálogo e disponibilidade (Priority: P0)

Visitante navega home, catálogo e detalhe; filtros reais e tamanhos disponíveis refletem MongoDB.
Independent Test: T-06–T-08, T-11, indisponibilidade MongoDB e filtro sizeBR com stock>0 no mesmo item.
Given produto inativo, when consultado publicamente, then 404/não listado; admin ainda o encontra.
Given edição, when cache é lido novamente, then nenhum dado proibido de produto inativo é exposto.
RF-14 é P1 na origem: busca/filtros podem vir após a consulta P0, sem mudar contratos.

### User Story 3 — Visitante recupera vistos recentemente (Priority: P0)

Histórico anônimo Redis mostra até cinco produtos únicos mais recentes com TTL de sete dias.
Independent Test: T-09–T-12; A,B,A retorna A,B; sete produtos limitam a cinco; queda Redis não derruba loja.
Dados atuais e status ativo são revalidados no MongoDB, referências inválidas são ignoradas.

### User Story 4 — Visitante monta carrinho e pede pelo WhatsApp (Priority: P0)

Carrinho guarda produto+tamanho+quantidade; backend revalida e monta URL da solicitação.
Independent Test: T-13–T-16; 2x15990 + 8990 = 40970; cliente não pode impor preço.
Given preço alterado, when resumo atual chega, then UI pede confirmação antes de abrir link.
Given falta de estoque/contato, when tenta finalizar, then erro 422/503 e nenhum link inválido é aberto.
Given solicitação válida, when WhatsApp abre, then não há pagamento, reserva, envio automático ou pedido confirmado.

### User Story 5 — Experiência visual aprovada e hero Y-only (Priority: P1)

A marca e composição já orientam o layout básico P0; o diferencial 3D exige um GLB licenciado real.
Independent Test: T-17–T-20 e T-22–T-23; comparação com imagem 04, largura 360px, teclado e reduced-motion.
Given clique rápido em destaques, when mídia termina de carregar, then id atual governa todos os campos.
Given arraste vertical, then polar/câmera não inclina; azimute livre, sem zoom/pan. Sem GLB: foto estática.

### Edge Cases

Duplicação produto+tamanho no carrinho; soma >10; JSON malformado; senha/CSRF ausentes;
ObjectId inválido; sku/slug reutilizado após soft-delete; tamanhos duplicados; atributos com operadores;
Redis indisponível após escrita MongoDB; foto/modelo inválido; clique fora de ordem; mudança de preço;
contato vazio; sessão expirada/logout e admin revogado; mídia sem licença; cache de produto inativo.

## Requirements

A numeração RF/RN/RNF original é mantida, sem criar uma lista concorrente:
[PRD V1.1](../../docs/reference/especificacao-v1.1/docs/01-requisitos-prd.md).
RF-01–04 → US1; RF-05/06/10/14 → US2; RF-09 → US3; RF-07/08 → US4;
RF-11/12/13/15/16 → US5 (RF-16 usa gravação admin da US1).
RN-01–10 e RNF-01–07 são normativos. Testes T-01–24 da origem são parte da aceitação.
P0 inclui demonstração dos três bancos, README e vídeo 5–10 minutos até 26/11/2026.

### Key Entities

Identidade Supabase, AdminProfile, StoreSettings singleton, MongoProduct com subdocumentos,
RecentHistory anônimo, PublicProductCache derivado e CartItem local. Sem entidade Order/Payment.
Ver [data-model.md](data-model.md).

## Success Criteria

- SC-01: autenticação/admin negativo e positivo demonstrados; cadastro aparece na próxima consulta pública.
- SC-02: recentes sem duplicatas e TTL/cache 300s demonstrados, inclusive fallback Redis.
- SC-03: total em centavos e WhatsApp refletem MongoDB; nenhuma confirmação de pagamento/estoque.
- SC-04: homepage reconhecível, acessível em 360px e hero real Y-only quando GLB disponível.
- SC-05: testes pertinentes, revisão, evidências reais dos três bancos e vídeo acessível 5–10 minutos.

## Assumptions

Protótipo acadêmico BRL/pt-BR, sem clientes autenticados. Dados fictícios e ativos licenciados.
Contas/segredos de teste e GLB ainda não fornecidos; mocks só para desenvolvimento isolado.
A formalização técnica complementar consta em `docs/VALIDACAO-V1.1.md`; não equivale a regra comercial nova.
