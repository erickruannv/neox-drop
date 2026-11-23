# Apresentação NEOX drop — roteiro de 8 minutos

Roteiro atualizado em 23/11/2026, não é comprovação de vídeo já gravado.
Aplicação integrada na main :8000, com bancos reais; testes já registrados nas evidências.
Autorizar um único registro QA para a gravação do CRUD antes de executar esse trecho.
Não filmar .env, senhas, JWTs, chaves, URI Mongo ou painéis que revelem tokens.

| Tempo | Mostrar | Evidência obrigatória |
|---|---|---|
| 0:00–0:45 | Home real: cinco destaques, AM90 ausente; nove produtos no catálogo | Python 3.13/FastAPI/Jinja2/Tailwind; Supabase=identidade, Mongo=produtos, Redis=recentes |
| 0:45–1:45 | Login admin pelo formulário | Supabase Auth real, cookie HttpOnly e perfil admin ativo sob RLS; negação da segunda conta apenas após login válido (ainda pendente) |
| 1:45–3:15 | Com autorização prévia, cadastrar e editar um único tênis TESTE ACADÊMICO | Preço fictício em centavos; conferir documento no Atlas e alteração imediata no catálogo |
| 3:15–4:00 | Catálogo/detalhe e persistência | Produto aparece sem seed; reiniciar FastAPI e comprovar o mesmo documento/ID persistido |
| 4:00–5:15 | Carrinho e checkout | Selecionar tamanho, alterar quantidade/subtotal; comparar total confirmado com o preço autoritativo do Atlas |
| 5:15–5:45 | Solicitação WhatsApp | Mostrar resumo e link com contato autorizado; não enviar mensagem nem afirmar pagamento/reserva |
| 5:45–6:30 | Recentes e cache Redis | Até cinco IDs únicos, TTL7dias; chave temporária expira; cache300s não governa preços |
| 6:30–7:15 | Desativar apenas o QA autorizado, confirmar ausência no catálogo e fazer logout | Painel bloqueado sem sessão; negação por RLS da segunda conta somente se validada antes (ainda pendente) |
| 7:15–8:00 | Testes, Git e limitações | Mostrar contagens por categoria, commit/branch, papel dos bancos e o que permanece pendente |

## Papel de cada banco

- Supabase PostgreSQL/Auth: identidade, sessões, admin_profiles/RLS e store_settings privado.
- MongoDB Atlas: autoridade de produtos, preço em centavos, tamanhos/estoque e destaques.
- Upstash Redis: recentes/cache descartáveis. Falha degrada esses recursos sem inventar preço.

## Antes de gravar

1. Usar os projetos de teste e o perfil já aprovados; não reaplicar migrations ou repetir o postflight.
2. Usar o .env privado da main; contato WhatsApp, chave backend e checkout real já validados.
3. Usar as evidências reais registradas; novas escritas/ativações QA precisam da autorização correspondente.
4. No CRUD, usar apenas o único QA previamente autorizado. No carrinho, usar os três produtos
   acadêmicos ativos com preços fictícios; não modificar seus documentos nem enviar mensagens.
5. Abrir app.main:app, não a vitrine de fixtures :8001, para a prova de persistência real.
6. Manter um worker; não fazer push/deploy ou exibir arquivos secretos durante a gravação.

Evidências atuais: administrador real/RLS, CRUD/persistência Atlas, carrinho, 3D aprovado e
recentes Redis visíveis foram comprovados na main :8000. O único QA foi desativado ao final da
ativação temporária autorizada; preparar a autorização dos registros da gravação antes de filmar.
Checkout WhatsApp positivo passou em 23/11/2026, incluindo link e mensagem, sem envio real.
Os três produtos definitivos acadêmicos foram cadastrados e permanecem ativos; fonte em
mongo/catalogo-academico.json. Falta validar a segunda conta com credenciais válidas. Fotos/3D não
comprovam estoque real. Os quatro modelos 3D completos continuam fora desta validação.
Ordem final: Dunk → AM95 → Samba → Gazelle → Cortez. Nove produtos ativos, incluindo os três
cadastros adicionais autorizados. AM90 continua no catálogo/carrinho, mas não aparece em
hero, banners, lançamentos ou recentes da home; seu histórico Redis continua íntegro.
O3D do AM95 fica em Demonstração3D, no detalhe, separado da galeria fotográfica; não afirmar
GLB nativo concluído. Não filmar emulação como prova de aparelho físico.
Após gravar: conferir duração de 5–10 minutos, legibilidade, ausência de segredos, acesso ao vídeo e
acesso do professor ao GitHub. Publicação/push dependem da autorização do responsável.
