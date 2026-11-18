# 19 — Evidências e checklist de avaliação dos bancos

## Evidências por requisito
| Código | Diagrama principal | Persistência | Teste | Evidência no vídeo |
|---|---|---|---|---|
| RF-01/02 | 03 DER Supabase | `auth.users` + `admin_profiles` | login válido/inválido; perfil sem acesso | Login e painel restrito |
| RF-03/04 | 04 Documento Mongo | `products` | insert, update, soft-delete, duplicado | Cadastro e edição de produto |
| RF-05/06 | 04 Documento Mongo | `products` | consulta após escrita | Novo produto no catálogo |
| RF-09/10 | 05 Redis | LIST + cache TTL | ordem, duplicatas, TTL, invalidação | Vistos recentemente e TTL/cache |
| RF-07/08 | 08 Checkout | Mongo + contato Supabase | preço alterado, estoque, link | Carrinho, total e WhatsApp |
| RF-12/13/16 | 04/09 | Mongo `featured` + assets | troca dinamica de dados/GLB | Troca de tênis + fundo + giro Y |

## Artefatos exigidos para uma entrega profissional
- [ ] DER conceitual e lógico condizem com banco criado.
- [ ] Dicionário de dados atualizado com código e constraints.
- [ ] Scripts SQL e de índices Mongo versionados e testados em ambiente de teste.
- [ ] Chaves Redis com TTL demonstrável e sem dados pessoais.
- [ ] Endpoints em docs com payloads iguais aos modelos reais.
- [ ] Prova de perfil administrador inativo/ausente **negado**.
- [ ] Prova de índice único rejeitando SKU duplicado em teste controlado.
- [ ] Catálogo atualizado após cadastro sem redeploy.
- [ ] Lista de recentes deduplicada e limitada a 5.
- [ ] Checkout recalculando total com fonte MongoDB.
- [ ] README reproduz conexão com os 3 bancos sem compartilhar segredos.
- [ ] Vídeo de 5–10 min anexado, reproduzível e com todos os fluxos exigidos.

## Estado dos diagramas
Os diagramas estão **criados e editáveis**, mas **não validados contra bancos implantados**. Esta marcação deve ser atualizada somente depois da implementação, execução dos scripts, inspeção dos índices e testes em ambiente de demonstração.

## Roteiro de defesa oral (resumo)
- **Por que Supabase?** Login e dados relacionais com FK, restrições e RLS.
- **Por que MongoDB?** Tênis com galerias, numerações e atributos variáveis num mesmo documento.
- **Por que Redis?** Dados recentes e cache de curta duração com TTL, sem duplicar a base autoritativa.
- **Como os bancos se relacionam?** Pela API Python e por IDs lógicos, **sem joins ou FKs entre bancos**.
- **Por que o preço não vem do carrinho?** Segurança e consistência: o FastAPI confere valores no MongoDB antes de gerar o WhatsApp.
