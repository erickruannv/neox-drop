# 10 — Roteiro do vídeo (5–10 minutos) e entrega

**Obrigatório pelo enunciado:** vídeo de tela mostrando login do administrador, cadastro de novo produto **com atualização imediata no catálogo público** e simulação de compra redirecionando corretamente para WhatsApp com mensagem formatada. Vídeo ausente ou link quebrado invalida avaliação.

## Roteiro sugerido (7–8 minutos)
| Tempo aproximado | Ação e prova |
|---|---|
| 0:00–0:35 | Abrir NEOX drop e explicar o objetivo de bancos poliglotas |
| 0:35–1:15 | Mostrar home, catálogo e hero (opcional mostrar rotação 3D) |
| 1:15–2:10 | Fazer login de administrador no Supabase, sem expor senha |
| 2:10–3:30 | Cadastrar um tênis fictício com SKU, preço, tamanho, imagem e categoria; salvar no MongoDB |
| 3:30–4:10 | Abrir catálogo do cliente e atualizar a página; **novo tênis aparece imediatamente** |
| 4:10–5:00 | Abrir dois produtos e exibir “Vistos recentemente” vindo do Redis; citar cache/TTL |
| 5:00–6:15 | Adicionar dois produtos/tamanhos, alterar quantidades, mostrar cálculo total |
| 6:15–7:15 | Clicar **Pedir pelo WhatsApp**; mostrar link e mensagem com nomes/tamanhos/quantidades/total |
| 7:15–8:00 | Encerrar mostrando código/README e responsabilidades de cada banco |

## Preparação
- Preparar dados fictícios e **um produto novo** ainda não existente.
- Testar conexão dos 3 bancos e limpar logs sensíveis; não mostrar abas com tokens/chaves.
- Definir número de demonstração autorizado para WhatsApp, evitando enviar mensagem real desnecessária.
- Roteiro ensaiado no ambiente **que será gravado** (local ou publicado).
- Ajustar resolução para leitura confortável; vídeo 5 a 10 minutos; voz/legendas conforme professor permitir.

## Checklist de submissão
- [ ] GitHub/GitLab com código **completo**, banco/configuração e instruções reproduzíveis.
- [ ] Código corresponde à versão do vídeo (tag sugerida `avaliacao-3-v1`).
- [ ] `.env.example`, migrations SQL e seed/documento de coleção presentes, sem senhas.
- [ ] Vídeo de 5 a 10 minutos anexado ou com link compartilhado.
- [ ] Testar **link do vídeo** em navegação anônima.
- [ ] Testar **link do repositório** em navegação anônima, se professor precisar acessar.
- [ ] Cadastro MongoDB e atualização imediata explícitos no vídeo.
- [ ] Login admin Supabase e checkout WhatsApp explícitos no vídeo.
- [ ] Redis verificável no funcionamento, com demonstrativo de recentes.
- [ ] Submeter até **26/11/2026**, via **Plataforma A**.

## Limites éticos e de produto
Não afirmar que a mensagem foi enviada ou o pedido foi pago apenas porque o WhatsApp abriu. Não colocar números, emails ou senhas pessoais na captura de tela sem necessidade. Demonstração não é anúncio de venda real.
