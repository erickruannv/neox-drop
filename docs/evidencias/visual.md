# Revisão visual da homepage — 2026-11-19

Branch `feature/frontend`. HTML renderizado com Jinja2 real a partir de fixtures validadas no
OpenAPI (`pnpm preview`) e capturado em Chromium (`node tests/e2e/tools/screenshots.mjs`).
Referência: `docs/reference/visual/04-homepage-aprovada.png` e marca `01`.
Critérios: checklist UI UX Pro Max §1–§7 (acessibilidade, toque, performance, layout,
tipografia/cor, animação). As buscas no dataset para carrossel/e-commerce não tiveram
correspondência; foi usado o checklist geral do skill.

Este documento cobre parte de T026. Não compara pixel a pixel com a referência 04 e não
substitui a validação humana.

## Capturas

| Arquivo | Conteúdo |
|---|---|
| `visual/home-1440-hero.png` | 1440×900, primeiro destaque |
| `visual/home-1440-slide2.png` | 1440×900, após selecionar a miniatura 2 |
| `visual/home-1440-full.png` | 1440, página inteira |
| `visual/home-360-hero.png` | 360×780 (@2x), primeiro destaque |
| `visual/home-360-slide2.png` | 360×780, após selecionar a miniatura 2 |
| `visual/home-360-full.png` | 360, página inteira |

## Diferenças encontradas e tratamento

| # | Diferença em relação à ref. 04 / problema | Impacto | Ação |
|---|---|---|---|
| 1 | Miniatura ativa sem anel lima: utilitário `border-transparent` sobrescrevia a regra de componente | Bug; marcador invisível | Corrigido com variante `aria-[current=true]:border-lime` |
| 2 | Com GLB carregado, `hero-media` colapsava para altura 0 ao esconder a foto | Bug; o viewer ficava invisível e não era possível girar o modelo | Corrigido com `aspect-[630/304]` reservado (também evita CLS) |
| 3 | SVGs de demonstração chapados, com aspecto de clip-art | Aparência pouco premium | Sombreado, costuras, cravos no solado, aba no calcanhar, brilho na biqueira e viewBox recortado |
| 4 | Hero mais alto que o mockup; no celular, CTA abaixo da primeira dobra | Composição/CTA | Paddings e alturas mínimas reduzidos; em 360px o CTA aparece na primeira tela |
| 5 | Preço sem hierarquia (`R$` do mesmo tamanho do valor) | Tipografia | `R$` menor, valor em 44px com algarismos tabulares, como na ref. 04 |
| 6 | Arco decorativo cruzava a descrição | Legibilidade | Arco deslocado para trás da seta; oculto abaixo de `lg` |
| 7 | Lettering de fundo cortado e quase invisível | Composição | Tamanho limitado à coluna, `nowrap`, opacidade 0,12 |
| 8 | Textos da faixa de confiança em duas linhas | Ritmo | Textos mais curtos, todos em uma linha a 1440 |
| 9 | Tênis menos dinâmico que a foto da ref. 04 | Composição | Inclinação de −9° na flutuação (desligada com reduced-motion) |

## Diferenças mantidas de propósito

- Faixa de confiança sem frete grátis, 10x, troca ou compra segura (cap. 05).
- Sem menu Promoções, favoritos e selos NOVO/DESTAQUE; o card mostra a categoria real.
- Lettering com a primeira palavra do produto, não com a marca do fabricante.
- Ilustrações vetoriais próprias no lugar das fotos de fabricantes da referência. Fotos reais
  licenciadas devem substituí-las quando existirem.

## Carrossel e Model Viewer

- Troca conjunta de nome, preço, descrição, imagem, fundo, acento, CTA, contador e marcador:
  `tests/e2e/hero.spec.js` e captura `home-*-slide2.png`.
- Giro: `tests/e2e/hero-3d.spec.js` carrega um GLB de caixa gerado em memória (somente teste)
  e arrasta o modelo no Chromium. Resultados:
  - arraste horizontal altera theta;
  - phi permanece igual depois dos arrastes horizontal e vertical;
  - arraste vertical não altera theta;
  - roda do mouse não altera o raio (zoom desligado).

  No celular a verificação é por atributo (`touch-action="pan-y"`); não houve teste de toque real.
- Sem `model3dUrl` a página mostra só a foto 2D, sem texto de 3D. Em caso de erro, a foto
  continua visível. O RF-13 continua pendente até haver um GLB licenciado (T024), e o phi de
  `75deg` é provisório.

## Pendências visuais

- Comparação lado a lado com a ref. 04 por responsável humano.
- Contraste do texto sobre gradientes (hero/coleções): calculado manualmente, mas o axe
  não mede contraste em gradientes.
- Fotos licenciadas dos produtos reais.
