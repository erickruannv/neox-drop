# Apresentação NEOX drop — roteiro de 8 minutos

Roteiro atualizado em 23/11/2026, não é comprovação de vídeo já gravado.
Aplicação integrada na main :8000, com bancos reais; testes já registrados nas evidências.
Autorizar um único registro QA para a gravação do CRUD antes de executar esse trecho.
Não filmar .env, senhas, JWTs, chaves, URI Mongo ou painéis que revelem tokens.

Ordem igual ao fluxo exigido: login → painel → cadastro → MongoDB → catálogo → produto → Redis →
carrinho → total → WhatsApp.

| Tempo | Tela e ação | O que dizer (curto) |
|---|---|---|
| 0:00–0:40 | Home `127.0.0.1:8000`: cinco destaques; `/tenis` com nove tênis | Stack: Python 3.13, FastAPI, Jinja2, Tailwind/JS. Supabase = login/perfil, MongoDB = produtos, Redis = recentes/cache |
| 0:40–1:30 | `/admin/produtos` sem sessão → redireciona ao login. Login no formulário (senha mascarada) | Supabase Auth real; cookie HttpOnly; perfil admin lido do PostgreSQL com RLS |
| 1:30–2:50 | Painel: cadastrar o único produto TESTE ACADÊMICO autorizado | Validação no servidor; preço em centavos; SKU duplicado é recusado (mostrar tentativa) |
| 2:50–3:30 | Atlas Data Explorer: coleção `products`, filtro pelo SKU do QA | Documento gravado no MongoDB, mesmo ID exibido no painel |
| 3:30–4:10 | `/tenis` (sem recarregar dados à mão) e página do produto QA | Aparece imediatamente, sem seed. Reiniciar o Uvicorn e recarregar: mesmo produto/ID |
| 4:10–5:00 | Abrir dois tênis; voltar à home → "Vistos recentemente". Upstash Data Browser: chave `recent:visitor:…` e TTL | Lista no Redis: mais recente primeiro, sem repetição, até 5 itens, TTL 7 dias |
| 5:00–6:10 | Carrinho: tamanho obrigatório, dois produtos, alterar quantidade, remover um, subtotal | Carrinho guarda só id/tamanho/quantidade; preço e estoque são revalidados no backend |
| 6:10–6:50 | "Pedir pelo WhatsApp": mostrar resumo e o link `wa.me` aberto, sem tocar em Enviar | Número vem do Supabase (`store_settings`); mensagem codificada com itens, tamanhos e total |
| 6:50–7:30 | Painel: desativar o QA; conferir que sumiu do catálogo; logout; painel bloqueado | Desativação lógica (documento preservado); sessão invalidada |
| 7:30–8:00 | GitHub `erickruannv/neox-drop`: README, `.env.example`, testes | Repositório público, sem segredos; limitações declaradas |

## Gravação sem expor credenciais

- Antes de gravar: fechar o editor com `.env`, terminal com histórico de comandos e abas de chaves.
- Digitar a senha no campo mascarado (não colar de arquivo visível); desligar a sugestão de senha
  do navegador ou usar perfil limpo.
- Atlas: abrir direto Data Explorer → `neox_drop_test.products`; não abrir "Connect"/URI.
- Upstash: abrir Data Browser; não abrir a aba de detalhes com REST token. Supabase: não abrir
  Settings → API Keys.
- Se aparecer algo sensível, cortar o trecho antes de publicar. Não filmar o DevTools com cookies.
- Usar 1920×1080, zoom do navegador 110–125%, mouse lento; ensaiar uma vez antes.

## Papel de cada banco

- Supabase PostgreSQL/Auth: identidade, sessões, admin_profiles/RLS e store_settings privado.
- MongoDB Atlas: autoridade de produtos, preço em centavos, tamanhos/estoque e destaques.
- Upstash Redis: recentes/cache descartáveis. Falha degrada esses recursos sem inventar preço.

## Antes de gravar

1. Usar os projetos de teste e o perfil já aprovados; não reaplicar migrations ou repetir o postflight.
2. Usar o .env privado da main; contato WhatsApp, chave backend e checkout real já validados.
3. Usar as evidências reais registradas; novas escritas/ativações QA precisam da autorização correspondente.
4. No CRUD, usar apenas o único QA previamente autorizado. No carrinho, usar os nove produtos
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
acesso do professor ao GitHub (público em https://github.com/erickruannv/neox-drop).
