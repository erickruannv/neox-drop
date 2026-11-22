# Apresentação NEOX drop — roteiro de 8 minutos

Roteiro preparado em 22/11/2026, não é comprovação de execução nem vídeo já gravado.
Só demonstrar o fluxo abaixo como real depois de concluir as autorizações e testes externos.
Não filmar .env, senhas, JWTs, chaves, URI Mongo ou painéis que revelem tokens.

| Tempo | Mostrar | Evidência obrigatória |
|---|---|---|
| 0:00–0:45 | Objetivo acadêmico e arquitetura FastAPI/Jinja2 | Python3.13, Tailwindv4/JS; três responsabilidades de bancos distintas |
| 0:45–1:45 | Login admin pelo formulário | Supabase Auth real, cookie HttpOnly e perfil admin ativo sob RLS; segunda conta recebe acesso negado |
| 1:45–3:15 | Cadastrar tênis identificado TESTE ACADÊMICO | Preço/estoque fictícios e centavos inteiros; documento realmente presente em neox_drop_test.products |
| 3:15–4:00 | Catálogo/detalhe e persistência | Produto aparece sem seed; reiniciar FastAPI e comprovar o mesmo documento/ID persistido |
| 4:00–5:15 | Carrinho e checkout | Selecionar tamanho, alterar quantidade/subtotal; mudar preço via API admin e mostrar revalidação no checkout |
| 5:15–5:45 | Solicitação WhatsApp | Mostrar resumo e link com contato autorizado; não enviar mensagem nem afirmar pagamento/reserva |
| 5:45–6:30 | Recentes e cache Redis | Até cinco IDs únicos, TTL7dias; chave temporária expira; cache300s não governa preços |
| 6:30–7:15 | Logout e segurança | Painel bloqueado depois do logout, RLS nega outro usuário, sem credenciais em JS/HTML; Atlas readWrite só no banco de teste |
| 7:15–8:00 | Testes, Git e limitações | Mostrar contagens por categoria, commit/branch, papel dos bancos e o que permanece pendente |

## Papel de cada banco

- Supabase PostgreSQL/Auth: identidade, sessões, admin_profiles/RLS e store_settings privado.
- MongoDB Atlas: autoridade de produtos, preço em centavos, tamanhos/estoque e destaques.
- Upstash Redis: recentes/cache descartáveis. Falha degrada esses recursos sem inventar preço.

## Antes de gravar

1. Confirmar projeto de teste, postflight e perfil admin autorizado, Atlas restrito e coleção/índices.
2. Configurar Redis Free e contato autorizado para checkout; guardar credenciais apenas no .env.
3. Executar a suíte real autorizada e o runner seguro do README. Não usar testes mock como prova.
4. Usar apenas produtos QA explicitamente fictícios. Preservar documentos inativos como evidência.
5. Abrir app.main:app, não a vitrine de fixtures :8001, para a prova de persistência real.
6. Manter um worker; não fazer push/deploy ou exibir arquivos secretos durante a gravação.

Se houver bloqueio externo, apresentar como pendência: atualmente o postflight/logins, CRUD e
Redis reais ainda aguardam acessos/configuração/autorização. A leitura Auth/negação anônima e
ping Atlas já têm evidência real, mas não substituem a jornada acima. Fotos/3D da vitrine e a
visualização por fixtures não comprovam estoque. A tarefa dos quatro modelos 3D fica separada.
