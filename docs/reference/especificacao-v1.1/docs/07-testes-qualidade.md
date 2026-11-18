# 07 — Plano de testes e qualidade

## Estratégia
- **Unidade** (`pytest`): dinheiro em centavos, formatação BRL, cálculo, validação e regras de estoque.
- **Integração**: conectores reais de Supabase/MongoDB/Redis **em ambiente de teste** com dados fictícios; instabilidade externa tratada.
- **HTTP/API** (`httpx` + TestClient/AsyncClient): status HTTP, auth, formatos, validação, paginação, rate limit.
- **E2E** (Playwright ou roteiro manual reproduzível): login, cadastro, atualização no catálogo, recentemente vistos, carrinho e WhatsApp.
- **Visual**: comparação com mockup aprovado e mobile.

## Casos prioritários
| ID | Caso | Resultado esperado |
|---|---|---|
| T-01 | Login válido de admin ativo | Acesso painel |
| T-02 | Senha inválida | Login negado sem vazar dados |
| T-03 | Usuário Supabase sem admin | 403, mesmo autenticado |
| T-04 | POST produto válido no admin | Documento MongoDB criado |
| T-05 | SKU/slug duplicado | 409, nenhum registro duplicado |
| T-06 | Catálogo após cadastro | Produto visível em nova consulta |
| T-07 | Editar preço | Novo preço visível e cache invalidado |
| T-08 | Desativar produto | Desaparece do público, permanece no admin |
| T-09 | Visitar A, B, A | Redis retorna A,B (sem duplicação) |
| T-10 | Visitar 7 produtos | Redis mantém só 5 recentes |
| T-11 | Cache hit/miss e TTL | Segunda leitura em cache; expiração/invalidação |
| T-12 | Redis indisponível | Catálogo e checkout continuam |
| T-13 | Carrinho 2 × R$ 159,90 + 1 × R$ 89,90 | Total `40970` centavos = R$ 409,70 |
| T-14 | Cliente falsifica preço | Servidor ignora preço cliente |
| T-15 | Tamanho sem estoque | Checkout negado com erro claro |
| T-16 | Link WhatsApp | Número configurado + itens, tamanhos e total URL-encoded |
| T-17 | Modelo GLB no hero | Tênis gira 360° em torno de Y, sem tilt vertical |
| T-18 | Seleção outro destaque | Modelo, texto, preço, fundo e indicação mudam juntos |
| T-19 | Prefers reduced motion | Giro automático desativado |
| T-20 | `model3dUrl` ausente | Foto 2D e UI continuam funcionais |
| T-21 | Acesso sem CSRF | Operação autenticada rejeitada |
| T-22 | Narrow viewport 360 px | Sem horizontal overflow crítico; CTA utilizável |
| T-23 | Teclado/navegação assistiva | Foco visível, seletores acessíveis, alt útil |
| T-24 | Link de vídeo/repositório | URLs abrem sem autenticação do avaliador |

## Casos de borda
- Preço 0 ou acima do limite definido; quantidade zero/negativa/decimais; tamanho fora da lista.
- Produto desativado enquanto está no carrinho; preço alterado entre visualização e checkout.
- MongoDB indisponível (erro 503 sem stacktrace); Redis timeout curto e fallback.
- Compras com muitos itens, título muito longo, acentos, emoji e caracteres especiais na URL WhatsApp.
- Token expirado, logout, tentativa de acesso ao admin por URL direta.
- Mobile touch: arraste horizontal no hero não deve disparar rolagem vertical involuntária; permitir rolagem natural fora do viewer.

## Evidências por tecnologia
**Supabase:** demonstrar tela de login, sessão autorizada e perfil de admin, ocultando e-mails e tokens quando necessário.  
**MongoDB:** cadastrar tênis e exibir imediatamente no catálogo, demonstrando persistência depois de recarregar.  
**Redis:** visitar 2–3 produtos e mostrar 'Vistos recentemente'; opcionalmente capturar uma leitura controlada do valor de Redis/TTL ou um log de cache-hit sem segredos.  
**WhatsApp:** clicar em Finalizar, confirmar link/texto, **não enviar uma mensagem real sem necessidade**.

## Gates de entrega
- `pytest` passa.
- Linters/formatadores (`ruff`) sem erros críticos.
- Segredos não commitados (`git grep`, scanner quando disponível).
- Auditoria de dependências sem risco crítico não tratado.
- Pelo menos um teste real de cada banco documentado em README.
- 5–10 minutos de vídeo com os três requisitos visíveis, sem links quebrados.
