# 06 — Segurança, privacidade e riscos

## Ameaças principais
| Risco | Contramedida |
|---|---|
| Qualquer login virar admin | Autenticar com Supabase **e** conferir `admin_profiles.role='admin' AND is_active=true` a cada operação protegida |
| Alteração de produto sem login | Autorizar em **todos** os endpoints de mutação e consultas administrativas; não depender da interface |
| Exposição de credenciais | `.env` ignorado pelo Git; variáveis no servidor; serviço secrets nunca enviados ao cliente |
| Sessão roubada/CSRF | Cookies HttpOnly/Secure/SameSite, expiração, revogação/refresh, token CSRF para operações de escrita e verificação de `Origin` |
| Força bruta de login | Rate limit de IP/identidade e mensagens genéricas, sem enumerar contas |
| Preço manipulado no browser | Servidor reconsulta MongoDB e recalcula `lineTotalCents`/`totalCents` |
| IDs/inputs maliciosos | Pydantic, tamanho máximo, validação de ObjectId, allowlist de campos/sort; nunca interpolar entradas em operadores MongoDB |
| XSS nos templates | Escape automático Jinja2; não marcar conteúdo de produto como HTML confiável; CSP quando possível |
| SSRF via imagem/modelo remoto | MVP aceita caminhos próprios/URLs https de fontes permitidas; nunca buscar URL arbitrária pelo backend |
| Falha Redis | Recuperação controlada e sem travar catálogo; timeout curto e logs sem segredos |
| Acesso ao Atlas | IP allowlist/conta de DB com menor privilégio; evitar abertura global permanente |
| Plugins/agentes inseguros | Inspecionar skills/hooks/MCP e permissões; não lhes repassar tokens; aprovação prévia de scripts externos |

## Supabase — autenticação
- `sign_in_with_password` para login, `get_user(jwt)` para validar usuário. Não usar `get_session()` de armazenamento compartilhado como prova isolada de autenticação.
- Tokens: cookies seguros enviados somente sobre HTTPS em produção, HttpOnly, SameSite Lax/Strict adequado; refresh com rotação; logout limpa cookies e invalida sessão quando aplicável.
- Evitar clientes Supabase com **estado de usuário compartilhado** entre requisições. Construir cliente por request quando necessário ou chamar `get_user(jwt)` isoladamente.
- O login pode ter sucesso no Auth, mas só entrar no painel se perfil estiver ativo. Primeiro admin criado por processo manual supervisionado.
- **RLS habilitado** nas tabelas app, com políticas mínimas; `service_role`/secret bypassa RLS e só pode existir no backend com autorização explícita em cada ação. Preferir acesso sujeito à identidade do usuário onde a arquitetura permitir.

## MongoDB
- Usuário da aplicação com menor privilégio em `neox_drop` (sem acesso a bancos de outras aplicações).
- TLS habilitado para Atlas; URL da conexão apenas no servidor.
- Índices únicos e validações para SKU/slug; projetar query a partir de filtros permitidos.
- Não expor consulta admin para visitantes; soft-delete de produtos.
- Desativação invalida cache Redis e remove produto das respostas públicas.

## Redis
- Token Upstash só no servidor, nunca em HTML/JS.
- `recent:visitor:{id}` não deve conter identificação pessoal; IDs aleatórios e expiração.
- URLs/credenciais de Redis não devem aparecer no terminal do vídeo, screenshots ou logs.
- Proibir uso de Redis como fonte da verdade do preço.

## Checkout/WhatsApp
- Recalcular tudo no MongoDB; não confiar em dados monetários recebidos.
- Limitar número de itens, quantidade, tamanho de mensagens e frequência de pedidos.
- Validar telefone destino nas configurações, só dígitos E.164 sem `+` para `wa.me`.
- Não armazenar nome, CPF ou telefone de cliente na V1.
- Mensagem diz "gostaria de pedir", sem alegar compra aprovada ou paga.
- Usuário confirma envio no WhatsApp; o site não tem como garantir recebimento.

## Segurança 3D e ativos
- Carregar somente GLB/GLTF com origem conhecida, licença identificada e tamanho razoável.
- Evitar scripts de terceiros não confiáveis; fixar versões e observar política de atualização.
- Se modelo remoto externo indisponível, fallback para imagem com alt.

## Testes mínimos de segurança
- Público recebe 401/403 ao tentar POST/PATCH/DELETE `/api/admin/products`.
- Usuário Auth sem perfil ativo **não** pode ser admin.
- Preço enviado pelo cliente é ignorado.
- Request sem CSRF válido é rejeitada nos fluxos autenticados por cookies.
- Input `{"$gt": ""}` não vira operador do MongoDB.
- `.env` e chaves não aparecem no Git, no HTML ou em respostas JSON.
- Testes adversariais somente na própria instância local/homologação e com dados fictícios. Strix, se usado, apenas em ambiente autorizado, com limites de requisição.

## Observação
Este documento é um plano de segurança. **Não é relatório de pentest, auditoria concluída nem garantia de invulnerabilidade.**
