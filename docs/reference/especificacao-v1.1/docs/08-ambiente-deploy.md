# 08 — Configuração local e publicação condicional

## Estado atual
Este é um **roteiro de configuração**. A documentação não implica que serviços, contas, banco ou deploy já estejam criados. Validar tudo no ambiente real antes de escrever "instalado".

## Pré-requisitos propostos
- macOS ou Windows; Git, Python 3.12+ (compatibilidade confirmar em lockfile), Node.js LTS apenas para build Tailwind.
- Conta Supabase, MongoDB Atlas, Upstash e, se publicado, Vercel.
- IDE (Cursor/VS Code) e Claude Code/Codex opcionais.

## Setup a implementar
1. Criar repositório Git privado durante desenvolvimento (tornar público apenas ao remover segredos e dados sensíveis).
2. Criar venv e instalar projeto: `python -m venv .venv`, `source .venv/bin/activate`, `pip install -e '.[dev]'` **quando** `pyproject.toml` existir.
3. `npm install` e `npm run build:css` **quando** scripts de Tailwind existirem.
4. Copiar `.env.example` → `.env`, preencher somente no dispositivo/host. Não commitar `.env`.
5. Supabase: criar projeto; aplicar migrations revisadas; habilitar RLS; criar administrador manual e perfil ativo, sem credenciais padrão.
6. Atlas: criar cluster e usuário com privilégios mínimos; URL de conexão; índices; seed fictícia com imagens licenciadas.
7. Upstash Redis: criar banco REST e copiar URL/token; testar cache/TTL sem mostrar credenciais.
8. Ajustar número WhatsApp da loja; para teste local, um número **autorizado** pelo responsável.
9. Rodar `uvicorn app.main:app --reload` após a implementação, e abrir endereço local indicado no terminal.
10. Executar testes e documentação; produzir vídeo sem expor tokens.

## Variáveis em `.env.example`
- `APP_ENV`, `APP_BASE_URL`, `COOKIE_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (somente se realmente necessário), `MONGODB_URI`, `MONGODB_DB_NAME`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STORE_WHATSAPP_NUMBER`, `LOG_LEVEL`.
- Variáveis sensíveis nunca em JS/HTML ou no vídeo.
- `COOKIE_SECRET` deve ser aleatória e diferente por ambiente; não há valor padrão seguro.

## Compatibilidade e deploy online
A Vercel tem runtime Python/FastAPI, mas **não presumir que ela será automaticamente compatível com nosso build de Jinja2 + CSS + assets 3D**. Criar prova de conceito de deploy simples, revisar plano, cold start, limites de funções, TLS, arquivos estáticos e CORS/CSP. **Nenhum deploy sem autorização do dono do projeto.**

### Risco principal: Atlas + rede
MongoDB Atlas depende de lista de IPs permitidos; hosts serverless podem usar IPs de saída variáveis. **Não liberar `0.0.0.0/0` por conveniência sem avaliação e aprovação**. Considerar solução controlada/provedor com egress estável ou seguir com execução local para demonstração se necessário.

### Checklist de publicação
- [ ] Sem segredos no Git ou conteúdo estático.
- [ ] Variáveis por ambiente criadas na plataforma, sem cópias desnecessárias.
- [ ] HTTPS ativo, cookies `Secure` e `HttpOnly`.
- [ ] Login de admin e RLS testados online.
- [ ] Mongo e Redis conectam do ambiente publicado.
- [ ] Assets e GLB são públicos **apenas** quando destinado, sob licença compatível.
- [ ] `/health`, homepage, admin, carrinho, checkout e fallback 2D testados.
- [ ] Controle de custos/limites monitorado; sem serviços pagos ativados implicitamente.
- [ ] Se deploy falhar, plano B local completo e vídeo funcional.

## Roteiro de recuperação
- Credencial exposta: revogar e rotacionar, atualizar ambiente, reescrever histórico conforme necessário, investigar acesso.
- Banco indisponível: registrar incidente, desligar operações que dependem dele; Redis degrade benignamente.
- Deploy com problema: voltar para commit/tag anterior; não migrar dados destrutivamente na véspera da entrega.
