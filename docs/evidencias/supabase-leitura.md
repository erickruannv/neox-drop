# Supabase — verificação real de leitura, sem habilitar conexões da aplicação

Data: 19/11/2026. Branch feature/backend. Verificação solicitada pelo usuário com
SUPABASE_URL e Publishable key no `.env`, mantendo TEST_CONNECTIONS_ENABLED=false.
Nenhum valor de URL, chave, senha, token, ID do projeto ou resposta remota foi incluído.

## Carregamento e correção local

O `.env` existe neste worktree, é ignorado pelo `.gitignore` e não é rastreado pelo Git.
Inicialmente os valores estavam sob NEXT_PUBLIC_SUPABASE_URL e
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Esses nomes de frontend não são lidos pela configuração
FastAPI, que espera SUPABASE_URL e SUPABASE_KEY.

Foram renomeadas apenas essas duas declarações no arquivo privado. Comparação local confirmou
valores preservados, demais variáveis intactas e flag mantido em false. Nenhuma credencial
foi copiada para arquivo rastreado. Uma instância real de app.main.app em processo novo
carregou os valores iguais aos do `.env`, sem overrides correspondentes no ambiente do processo.
Se houver servidor já em execução, ele precisará ser reiniciado para atualizar Settings em cache;
nenhum servidor foi reiniciado por esta verificação.

## Comunicação real com Python

HTTPX com TLS verificado, timeout de 10s, redirects desabilitados e somente header apikey
com a Publishable key. Não foi enviado header com Secret/service_role, nem JWT de usuário.
A checagem pontual usou GET direto explicitamente autorizado pelo usuário; não chamou o
adaptador protegido da aplicação nem alterou seu flag de conexões.

| Leitura real | Resultado |
|---|---|
| GET /auth/v1/health | HTTP 200 |
| GET /auth/v1/settings | HTTP 200 |
| GET /rest/v1/ | HTTP 401, confirmado nas tentativas de diagnóstico |

Python conseguiu resolver o destino, negociar HTTPS e obter respostas reais do Supabase Auth.
O endpoint de configurações Auth respondeu com a Publishable key fornecida. A raiz REST não
autorizou a requisição; esse 401 não foi classificado como chave inválida nem como falha de
RLS sem evidência. Não houve código de erro identificável nas classificações sanitizadas
usadas. Não foram publicados corpos de resposta nem ampliadas permissões para contornar isso.
Não houve consulta de tabela, login/criação de sessão, chamada RPC, SQL, migration ou escrita.

## Identidade do projeto

A URL tem formato HTTPS de projeto Supabase e a chave tem formato Publishable, sem whitespace.
Isso, junto à resposta do Auth, confirma comunicação com o destino configurado; não confirma
por si só o nome legível do projeto. O inventário do conector atual não lista neox-drop-test;
a consulta de metadados ao projeto da URL não teve acesso. Não houve restauração nem alteração
de conta, projeto ou conector.

Assim, o nome neox-drop-test ainda deve ser conferido no Dashboard pelo responsável, comparando
a Project URL com o arquivo privado, sem compartilhar os valores. A finalidade de teste foi
informada pelo usuário; não foi independentemente confirmada pelo conector nesta rodada.

## Resultado e próximo passo

- Configuração FastAPI: carregada após corrigir os nomes das duas variáveis.
- Proteção Git: `.env` ignorado e não rastreado.
- Rede/Auth real: comunicação aprovada nas duas leituras públicas acima.
- Raiz REST: acesso não autorizado (401), causa específica ainda não confirmada.
- Flag: false durante toda a verificação; aplicação continua sem habilitação dos adaptadores.
- Secret key: não utilizada; credenciais não exibidas ou versionadas.

Próximo passo: confirmar a identidade do destino no Dashboard e conferir a configuração da
Data API desse projeto para esclarecer o 401. Se necessário, validar tabelas/RLS numa etapa
separada autorizada. Esta verificação não comprova login administrativo, schema aplicado,
políticas RLS, acesso ao PostgreSQL por tabela, MongoDB, Redis ou checkout.
Nenhum usuário foi criado/modificado/excluído, nenhuma permissão/RLS foi alterada e não houve deploy.
