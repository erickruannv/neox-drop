# Contratos compartilhados — NEOX drop V1.1

- [OpenAPI 3.1.1, versão de contrato 1.1.0](openapi.json): 14 operações em 11 caminhos, 22 schemas.
- [Exemplos fictícios validados](examples.json): mocks de wire format, não dados persistidos.
- [Contrato Jinja2/JavaScript e páginas](ui.md).
- [Decisões de formalização, lacunas e validação](../VALIDACAO-V1.1.md).
- Origem preservada: [API V1.1](../reference/especificacao-v1.1/docs/04-contratos-api.md),
  [dicionário](../reference/especificacao-v1.1/docs/16-dicionario-de-dados.md) e
  [segurança](../reference/especificacao-v1.1/docs/06-seguranca.md).

Estado: contrato documental pronto para revisão e consumo por mocks, não API implementada.
Nenhuma rota adicional de negócio foi criada. O contrato detalha as rotas existentes;
complementos operacionais estão identificados por D01–D12 no relatório de validação.
As amostras `hex24` da referência são explicativas; aqui IDs válidos fictícios usam 24 hexadecimais.
Não há telefone configurado nem exemplo de waUrl com destinatário inventado.

## Regras comuns

JSON camelCase, centavos inteiros >=0, BRL, datas ISO 8601 UTC (`Z`), ObjectId serializado
como `id`. Não expor BSON, tokens, perfil/credenciais ou dados admin em projeções públicas.
Campos `model3dUrl`/`featured`/`attributes` opcionais são omitidos na leitura quando ausentes.
POST admin exige todos os campos obrigatórios de ProductCreate; PATCH exige ao menos um
campo permitido, faz merge em featured e substitui arrays completos. Null só remove model3dUrl.
Backend gera id e timestamps; campos imutáveis/operadores não são graváveis.

Autenticação: cookie `neox_admin_session` HttpOnly; refresh apenas em cookie HttpOnly
`neox_admin_refresh`. Validar usuário e admin ativo em cada request protegido. Não compartilhar
cliente Supabase mutável entre usuários. CSRF via `X-CSRF-Token`, obtido no HTML Jinja2;
rotacionar após login/logout. Origin deve ser validado quando presente; CSRF continua obrigatório
nos POST/PATCH/DELETE, inclusive login, recentes e checkout. Cookie anônimo `neox_visitor`
serve somente recentes, não autenticação. Cookies SameSite=Lax, Path=/, Secure sobre HTTPS;
exceção apenas para HTTP de loopback no ambiente de desenvolvimento explicitamente configurado.

A API não recebe preço confiável do carrinho. Extras monetários em checkout são ignorados,
sem usá-los em cálculo/query. Agrupar linhas produto+tamanho; máximo 10 unidades por grupo.
O limite operacional é 50 linhas de entrada e 8000 caracteres de mensagem, sem truncar o pedido.
`STORE_WHATSAPP_NUMBER` só pode participar de configuração controlada do singleton, nunca
sobrepor silenciosamente o telefone autoritativo do PostgreSQL. Sem contato: 503.

O detalhe público fornece `sizesAvailable`; a UI mostra disponível/esgotado por tamanho,
sem expor contagens administrativas. FeaturedList usa ProductDetail para sincronizar slug,
descrição, imagem, modelo e cores sem requisições separadas. Retorno de checkout é uma cotação
atual: a UI compara com o mostrado e pede novo clique antes de abrir o link se mudou o preço.
Não há erro PRICE_CHANGED calculável pelo servidor sem preço anterior na entrada.

## Erros e degradação

Corpo uniforme: `{error:{code,message,details:[]}}`. JSON inválido=400, não autenticado=401,
perfil não-admin/CSRF/Origin=403, produto inexistente/inativo público=404, duplicado=409,
validação/indisponibilidade=422, rate limit=429, dependência/config primária=503.
401 de login tem mensagem genérica; 403 só após identidade autenticada quando aplicável.
`VALIDATION_ERROR`, `AUTHENTICATION_FAILED`, `FORBIDDEN`, `CSRF_INVALID`, `NOT_FOUND`,
`PRODUCT_CONFLICT`, `CART_ITEM_UNAVAILABLE`, `CHECKOUT_LIMIT_EXCEEDED`, `RATE_LIMITED`,
`DEPENDENCY_UNAVAILABLE`, `STORE_WHATSAPP_NOT_CONFIGURED` são códigos estáveis deste baseline.
Details contêm apenas localização/código/mensagem seguros, nunca input de senha ou token.

`GET /api/recent` sem cookie/Redis: 200 com items vazio. `POST /api/recent` sem Redis: 204
best-effort após validar produto; não alegar persistência. Catálogo/checkout continuam se só
Redis caiu. MongoDB fora: 503 para operações que precisam validá-lo. `/health` retorna apenas
status: ok/degraded (200), unavailable (503); não revela destinos ou credenciais.

Invalidação Redis após gravação Mongo não é transação distribuída. Se falhar, escrita real
continua sucesso; impedir leitura pública stale por bypass/validação da fonte até reparo/TTL.
Política escolhida: em cache-hit, consultar no MongoDB active e updatedAt; só reutilizar
a projeção se active=true e a versão corresponder. Cache guarda envelope interno com
updatedAt + projeção pública, sem devolver o envelope ao cliente. Cada mutação deve avançar
updatedAt com comparação da versão anterior; colisão/revisão concorrente resulta em 409.
Isso preserva a correção mesmo se DEL falhar em outro worker; custa uma leitura pequena
ao MongoDB e deve ser medido, sem alegar melhoria de performance antes da evidência. Não duplicar side effect de visita:
GET detalhe é leitura; POST recentes registra uma vez.

## Responsabilidade

Codex detém o contrato e fixtures; Claude revisa os campos usados pela UI. Alteração incompatível
exige revisão conjunta, versionamento e atualização da rastreabilidade antes do merge.
O contrato de produto não autoriza executar tarefas nesta etapa.
