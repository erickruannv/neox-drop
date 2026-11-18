# 12 — Matriz de rastreabilidade do enunciado

| Requisito do professor | ID interno | Tecnologia/artefato | Prova no sistema/vídeo |
|---|---|---|---|
| E-commerce / catálogo com interface web/desktop | RF-05, RF-06 | FastAPI/Jinja2/Tailwind | Home, catálogo e detalhes |
| Supabase obrigatório, login administrador | RF-01, RF-02 | Supabase Auth + `admin_profiles` | Login seguro e painel restrito |
| MongoDB obrigatório, cadastro dos produtos | RF-03, RF-04 | Atlas `products` | Novo produto salvo e editável |
| Redis cache/selecionados recentemente | RF-09, RF-10 | Redis LIST com TTL + cache de detalhe | Abrir tênis, recentes, cache-hit/TTL |
| Painel admin criar produto (nome, descrição, preço, imagem) | RF-03 | Formulário + endpoint protegido | Cadastro demonstrado |
| Catálogo exibindo dados do MongoDB | RF-05 | API pública + Jinja2 | Atualização imediata visível |
| Carrinho adicionar/remover, calcular total | RF-07 | JS + cálculo/revalidação Python | Itens, quantidade e total |
| Comprar redireciona WhatsApp, texto formatado | RF-08 | Checkout FastAPI + `wa.me` | Abertura do link e texto correto |
| GitHub/GitLab código + configuração de bancos | E-01 | README, migration, seed, `.env.example` | Link do repositório |
| Vídeo 5–10 min com login/cadastro/catálogo/WhatsApp | E-01 | `docs/10-video-entrega.md` | Link acessível e demonstração |

## Itens adicionais aprovados (não substituem obrigatórios)
| Diferencial | ID | Critério de validação |
|---|---|---|
| Identidade NEOX drop | RF-11 | Logo, cores, tipografia e cards coerentes |
| Troca de produto+fundo+nome+preço | RF-12 | Miniatura atualiza campos em conjunto |
| Giro 3D de tênis somente Y | RF-13 | Modelo GLB, rotação de lado, sem tilt |
| Filtros por marca/tamanho/categoria | RF-14 | Consultas reais ao MongoDB |
| Mobile e redução de movimento | RF-15 | Testes viewport/teclado/motion |
| Admin controla modelos destacados | RF-16 | Configuração MongoDB aplicada à home |

## Como evitar perda de pontos
**Jamais trocar os três bancos por mock/simulação como entrega final.** Mocks são permitidos durante desenvolvimento, mas vídeo e versão final devem acessar os bancos reais. O 3D é um diferencial; se o tempo ficar curto, priorizar autenticação, cadastro, cache, carrinho, link WhatsApp e vídeo conforme enunciado.

## Referências de modelagem V1.1
| Critério | Diagrama | Dicionário / esquema |
|---|---|---|
| Supabase autenticação e perfil | [03 DER](diagramas/03-der-supabase.svg) | [16 dicionário](16-dicionario-de-dados.md), `supabase/migrations/0001_schema.sql` |
| MongoDB produtos | [04 Documento](diagramas/04-modelo-documental-mongodb.svg) | [17 índices](17-esquema-fisico-e-indices.md), `mongo/001_products_schema_indexes.mongodb.js` |
| Redis recentes/cache | [05 Chaves](diagramas/05-modelo-chaves-redis.svg) | [16 dicionário](16-dicionario-de-dados.md), `redis/README.md` |
| Integração poliglota | [01 Arquitetura](diagramas/01-arquitetura-poliglota.svg) | [18 fluxos](18-fluxos-e-consistencia.md) |
| Demonstração | [06–08 Sequências](15-diagramas-modelagem.md) | [19 evidências](19-matriz-evidencias-banco.md) |
