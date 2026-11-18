# Interface de páginas Jinja2, JavaScript e API

Fontes: capítulos 02/04/05 e imagens 01/04 em `docs/reference/`. Schema público e exemplos:
[openapi.json](openapi.json) e [examples.json](examples.json). Não criar uma API paralela para a UI.

## Páginas e contexto

| Página | Template planejado | Contexto acordado | Owner |
|---|---|---|---|
| `/` | `app/templates/home.html` | `featured: FeaturedList`, `launches: ProductList`, `recent: RecentList` | Claude template; Codex loader |
| `/tenis` | `app/templates/catalog.html` | `catalog: ProductList`, `filters` com os parâmetros da listagem | Claude template; Codex loader |
| `/tenis/{slug}` | `app/templates/product.html` | `product: ProductDetail` | Claude template; Codex loader |
| `/admin/login` | `app/templates/admin/login.html` | contexto global e erro genérico, sem credenciais preenchidas | Claude template; Codex loader |
| `/admin`, `/admin/produtos` | `app/templates/admin/products.html` | `products: AdminProductList`, `admin: AdminProfile` após autorização | Claude template; Codex loader |

Contexto global de `base.html`: `request` do Jinja2, `csrfToken` para meta tag, `siteName='NEOX drop'`.
Tokens CSRF não são access/refresh tokens; auth/segredos nunca entram no HTML. Loaders e registro
HTML pertencem a `app/api/pages.py` (Codex); Claude não altera `app/main.py` nem routers.
Página de produto inexistente/inativo: resposta HTML 404; página admin sem sessão vai a login
por redirecionamento same-origin; API continua usando 401/403 JSON, nunca HTML no fetch.
Admin autenticado sem perfil ativo recebe 403; não renderizar dados do painel antes da verificação.

## Interação

- Catálogo: GET `/api/products` com filtros documentados. Seletor vazio remove o filtro;
  page volta a 1 quando busca/filtros mudarem. Exibir loading, vazio, erro e paginação.
- Cartão: usar id/slug e dados da projeção; não construir IDs a partir do nome.
- Detalhe: registrar POST `/api/recent` uma vez por visita lógica; falha não bloqueia a tela.
- Carrinho persistido: somente `{productId,sizeBR,quantity}` (chave local `neox.cart.v1`).
  Validar esquema ao ler, descartar itens malformados. Dados/preços para exibição são temporários
  e derivados do catálogo; nunca gravar tokens ou preço autoritativo no localStorage.
- Checkout: POST `/api/checkout` com items; renderizar resumo do servidor. Se valor mudou,
  mostrar diferença e exigir confirmação explícita antes de abrir waUrl. Não abrir link
  de resposta antiga após editar carrinho. O link não envia mensagem automaticamente.
- Login/logout: usar corpos/CSRF/cookies do contrato; após sucesso rotacionar csrfToken pelo
  HTML recarregado. Não procurar token JWT no JSON. Admin CRUD consome apenas projeções admin.

## Identidade e hero

Manter composição do mockup: header preto/logo preferido, hero escuro com lettering de fundo,
produto grande, miniaturas/indicador lima, coleções Street/Classics/Performance e lançamentos.
As rotas/menu de referência não autorizam construir favoritos, promoções ou serviços financeiros.
Substituir somente claims sem comprovação, como frete grátis e 10x, conforme capítulo 05;
não redesenhar seções. Não copiar slogans/logos de fabricantes para a identidade NEOX drop.

FeaturedList entrega todos os campos juntos. Estado selecionado é o id; carregar mídia e só
publicar a transição se a resposta ainda corresponde ao id atual (evitar race de clique rápido).
Modelo GLB real e licenciado: azimute livre, polar phi igual em min/max, zoom/pan desligados;
arraste vertical não inclina. Phi exato e distância são ajustes do GLB durante teste, não valores
inventados a partir da foto. Reduced-motion desliga auto-rotação e transições desnecessárias.
Foto 2D imediata enquanto carrega/erro/sem modelo; fallback não finge rotação. Sem GLB no pacote,
a comprovação RF-13 permanece pendente, sem bloquear contratos e P0.

Tokens provisórios: ink #151515, paper #F5F3EF, sand #D4D3C7, coral #F23659, lime #BDF400,
deep-teal #192B30, white #FFFFFF. Validar cada par texto/fundo; não inferir acessibilidade da
imagem estática. Layout de 360 px a desktop, teclado, labels, alt e foco visível são critérios.

## Testes de integração previstos

Fixtures válidas do OpenAPI para desenvolvimento isolado. E2E conecta depois aos mesmos loaders,
sem manter dois catálogos. `tests/e2e/test_storefront.*` (Claude) cobre interação/visual;
`tests/contract/` (Codex) cobre wire format; evidências reais só após backend e bancos de teste.
