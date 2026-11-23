# Apresentação NEOX drop — roteiro de 8 minutos

Roteiro preparado em 22/11/2026, não é comprovação de execução nem vídeo já gravado.
Só demonstrar o fluxo abaixo como real depois de concluir as autorizações e testes externos.
Não filmar .env, senhas, JWTs, chaves, URI Mongo ou painéis que revelem tokens.

| Tempo | Mostrar | Evidência obrigatória |
|---|---|---|
| 0:00–0:45 | Objetivo acadêmico e arquitetura FastAPI/Jinja2 | Python3.13, Tailwindv4/JS; três responsabilidades de bancos distintas |
| 0:45–1:45 | Login admin pelo formulário | Supabase Auth real, cookie HttpOnly e perfil admin ativo sob RLS; negação da segunda conta apenas após login válido (ainda pendente) |
| 1:45–3:15 | Cadastrar tênis identificado TESTE ACADÊMICO | Preço/estoque fictícios e centavos inteiros; documento realmente presente em neox_drop_test.products |
| 3:15–4:00 | Catálogo/detalhe e persistência | Produto aparece sem seed; reiniciar FastAPI e comprovar o mesmo documento/ID persistido |
| 4:00–5:15 | Carrinho e checkout | Selecionar tamanho, alterar quantidade/subtotal; comparar total confirmado com o preço autoritativo do Atlas |
| 5:15–5:45 | Solicitação WhatsApp | Mostrar resumo e link com contato autorizado; não enviar mensagem nem afirmar pagamento/reserva |
| 5:45–6:30 | Recentes e cache Redis | Até cinco IDs únicos, TTL7dias; chave temporária expira; cache300s não governa preços |
| 6:30–7:15 | Logout e segurança | Painel bloqueado depois do logout, RLS nega outro usuário, sem credenciais em JS/HTML; Atlas readWrite só no banco de teste |
| 7:15–8:00 | Testes, Git e limitações | Mostrar contagens por categoria, commit/branch, papel dos bancos e o que permanece pendente |

## Papel de cada banco

- Supabase PostgreSQL/Auth: identidade, sessões, admin_profiles/RLS e store_settings privado.
- MongoDB Atlas: autoridade de produtos, preço em centavos, tamanhos/estoque e destaques.
- Upstash Redis: recentes/cache descartáveis. Falha degrada esses recursos sem inventar preço.

## Antes de gravar

1. Usar os projetos de teste e o perfil já aprovados; não reaplicar migrations ou repetir o postflight.
2. Usar o .env privado da main; contato WhatsApp, chave backend e checkout real já validados.
3. Usar as evidências reais registradas; novas escritas/ativações QA precisam da autorização correspondente.
4. Usar apenas produtos QA explicitamente fictícios. Preservar documentos inativos como evidência.
5. Abrir app.main:app, não a vitrine de fixtures :8001, para a prova de persistência real.
6. Manter um worker; não fazer push/deploy ou exibir arquivos secretos durante a gravação.

Evidências atuais: administrador real/RLS, CRUD/persistência Atlas, carrinho, 3D aprovado e
recentes Redis visíveis foram comprovados na main :8000. O único QA foi desativado ao final da
ativação temporária autorizada; preparar a autorização dos registros da gravação antes de filmar.
Checkout WhatsApp positivo passou em 23/11/2026, incluindo link e mensagem, sem envio real.
Os três produtos definitivos acadêmicos foram cadastrados e permanecem ativos; fonte em
mongo/catalogo-academico.json. Falta validar a segunda conta com credenciais válidas. Fotos/3D não
comprovam estoque real. Os quatro modelos 3D completos continuam fora desta validação.
