# 00 — Contexto, premissas e decisões

## Origem e objetivo
Trabalho da **3ª Avaliação — Projeto de Banco de Dados**, valor **6,0 pontos**, individual ou dupla, entrega até **26/11/2026** na Plataforma A. Tema proposto: e-commerce/catálogo com arquitetura de banco de dados poliglota e interface gráfica obrigatória. O professor exige Supabase, MongoDB, Redis, carrinho e compra via WhatsApp, além de GitHub e vídeo de 5–10 minutos.

## Decisões da NEOX drop
- Nicho: tênis/sneakers (substitui proposta antiga de eletrônicos).
- Nome completo: **NEOX drop**; **NEOX** é o elemento tipográfico protagonista, **drop** é assinatura secundária.
- Direção aprovada: visual esportivo editorial premium; imagens de tênis grandes, cartões coloridos, espaços claros, preto, off-white, coral e toques de verde-lima. Hero com tênis flutuante e carrossel de destaques.
- Interação distintiva: seletor de sneakers atualiza o tênis, o fundo, o nome, o preço e o texto; **modelo 3D gira apenas ao redor do eixo vertical** (arraste horizontal em mouse/touch; animação suave opcional).
- Stack definida: Python/FastAPI + Jinja2 + Tailwind + JavaScript + `<model-viewer>`; Supabase Auth/PostgreSQL, MongoDB Atlas, Redis/Upstash.
- Publicação: preferencialmente online, **condicionada** a compatibilidade, segurança e planos sem custos; a execução local é contingência válida.
- Desenvolvimento por IA: Claude (UI/UX) e Codex (Python/bancos/testes), trabalhando em áreas/branches separadas; skills opcionais controladas.

## Prioridades
- **P0 — exigido para avaliação:** login, CRUD de produto, atualização visível no catálogo, Redis, carrinho, WhatsApp, repositório, vídeo.
- **P1 — identidade e diferenciação:** hero 3D com pelo menos um `.glb` verdadeiro, carrossel sincronizado, responsividade e acessibilidade.
- **P2 — fora da primeira versão:** pagamento integrado, frete real, pedido confirmado, estoque reservado, conta de cliente, upload de mídia complexo, IA, integrações com catálogo real de marcas, analytics e backoffice avançado.

## Assunções explícitas
1. O sistema é uma **demonstração acadêmica**, sem transações comerciais reais.
2. A loja trabalha com BRL, português do Brasil e numeração brasileira de calçados.
3. Clientes **não fazem login**; somente administradores são autenticados.
4. O catálogo usará ativos de mídia próprios, gratuitos com licença ou demonstrativos; não assumir direito de uso de qualquer fotografia/logotipo de terceiros.
5. A publicação depende de contas e variáveis de ambiente que ainda deverão ser configuradas.
6. Os preços dos exemplos são fictícios; números/WhatsApp real não serão inventados.

## Glossário
**Hero:** área principal da página inicial; **drop:** coleção/lançamento; **SKU:** código único do produto; **slug:** parte legível da URL; **cache:** cópia temporária de dados; **RLS:** políticas de acesso por linha; **soft-delete:** desativação sem apagar definitivamente; **GLB:** formato de modelo 3D; **P0/P1/P2:** prioridade de implementação.
