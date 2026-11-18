# NEOX drop — Documentação oficial V1

**Status:** documentação / pré-implementação  
**Versão:** 1.1 — 18/11/2026 (modelagem e diagramas)  
**Entrega acadêmica:** até **26/11/2026**, via Plataforma A  
**Trabalho:** 3ª Avaliação — Projeto de Banco de Dados Poliglota (6,0 pontos)  
**Autor(es):** preencher antes da entrega.

## O que é
NEOX drop é um protótipo acadêmico de e-commerce de tênis, com marca visual própria, catálogo, carrinho de compras e pedido via WhatsApp. O principal objetivo da avaliação é **demonstrar persistência poliglota real**, usando **Supabase Auth/PostgreSQL**, **MongoDB** e **Redis** de modo verificável.

> **Este repositório contém inicialmente a documentação do projeto.** Os comandos de execução só funcionarão após a implementação. Nenhuma integração, hospedagem ou teste está sendo apresentada aqui como já realizada.

## Decisões fixadas
- Backend em **Python + FastAPI**; páginas em **Jinja2**, **Tailwind CSS** e JavaScript simples.
- Supabase: login seguro de administradores, perfis e configurações da loja.
- MongoDB: produtos, tamanhos, preços, imagens e configuração de destaque da homepage.
- Redis: histórico recente por visitante + cache temporário de dados de produtos.
- Carrinho por sessão/navegador, com preços e disponibilidade **revalidados no backend**.
- Checkout gera `https://wa.me/<numero>?text=<mensagem-url-encoded>`; não processa pagamento nem envia a mensagem automaticamente.
- Hero: tênis 3D `.glb`, com giro 360° **ao redor do eixo vertical**, sem inclinação vertical, além de troca sincronizada de modelo, nome, preço e cores.
- Modelo 3D faltante: fotografia 2D sem falso giro; prioridade de implementação é comprovar **um modelo 3D real** no hero.
- Sem compras, contratação de serviços pagos ou deploy em produção sem aprovação.

## Mapa da documentação
| Documento | Objetivo |
|---|---|
| [00 — Contexto](docs/00-contexto.md) | Premissas, decisões e limites |
| [01 — Requisitos](docs/01-requisitos-prd.md) | PRD, regras e critérios de aceitação |
| [02 — Arquitetura](docs/02-arquitetura.md) | Componentes, fluxo e estrutura |
| [03 — Modelagem](docs/03-modelagem-bancos.md) | Supabase, MongoDB e Redis |
| [04 — API](docs/04-contratos-api.md) | Endpoints, formatos e erros |
| [05 — UX/UI](docs/05-identidade-ux-ui.md) | Identidade, telas e hero 3D |
| [06 — Segurança](docs/06-seguranca.md) | Autorização, CSRF, dados e riscos |
| [07 — Testes](docs/07-testes-qualidade.md) | Casos automatizados e demonstração |
| [08 — Ambiente e publicação](docs/08-ambiente-deploy.md) | Setup, variáveis e deploy condicional |
| [09 — Backlog](docs/09-backlog-agentes.md) | Tarefas, responsáveis e cronograma |
| [10 — Vídeo e entrega](docs/10-video-entrega.md) | Roteiro e checklist de submissão |
| [11 — ADRs](docs/11-adrs.md) | Registro das decisões técnicas |
| [12 — Rastreabilidade](docs/12-rastreabilidade.md) | Critério do enunciado → implementação → prova |
| [13 — Referências](docs/13-referencias.md) | Documentação oficial para consulta |
| [14 — Status](docs/14-checklist-execucao.md) | Estado inicial e evidências pendentes |
| [15 — Diagramas](docs/15-diagramas-modelagem.md) | 9 diagramas vetoriais + versões editáveis |
| [16 — Dicionário](docs/16-dicionario-de-dados.md) | Tipos, PK/FK, documentos e TTL |
| [17 — Esquemas físicos](docs/17-esquema-fisico-e-indices.md) | Validações SQL/Mongo, índices e consultas |
| [18 — Fluxos](docs/18-fluxos-e-consistencia.md) | Sequências e consistência entre bancos |
| [19 — Evidências DB](docs/19-matriz-evidencias-banco.md) | Demonstração e roteiro técnico |

## Pacote de modelagem V1.1
- [Galeria de diagramas SVG/PNG](docs/diagramas/README.md) e [DER Supabase](docs/diagramas/03-der-supabase.svg).
- [Caderno técnico dos diagramas em PDF](NEOX_drop_Caderno_Tecnico_Diagramas_V1_1.pdf), pronto para apresentação.
- [Migration SQL de referência](supabase/migrations/0001_schema.sql) e [validador/índices do MongoDB](mongo/001_products_schema_indexes.mongodb.js).
- [Contrato de chaves Redis](redis/README.md).
- Os diagramas e os scripts são **artefatos de projeto**, não comprovação de execução em bancos reais.

## Material dos agentes
- [AGENTS.md](AGENTS.md): instruções compartilhadas para Claude e Codex.
- [CLAUDE.md](CLAUDE.md): atribuições específicas do Claude.
- [.env.example](.env.example): **nomes** de variáveis, sem segredos.

## Condições para entregar
1. Login de administrador pelo Supabase exibido no vídeo.
2. Produto cadastrado no MongoDB e aparecendo imediatamente no catálogo público.
3. Redis realmente usado e demonstrável, incluindo TTL/cache.
4. Carrinho funcionando e link do WhatsApp gerando mensagem correta.
5. README final com passos reproduzíveis, código completo, scripts e vídeo de **5–10 minutos** com link acessível.

## Próxima etapa
Validar serviços e contratos; implementar *primeira fatia vertical*: login → cadastro real MongoDB → catálogo, antes de investir em refinamentos do hero 3D. Consultar [backlog](docs/09-backlog-agentes.md).
