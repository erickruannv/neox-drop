# 05 — Identidade NEOX drop e especificação de UX/UI

## Referências aprovadas
A marca deve parecer um e-commerce de sneakers contemporâneo, com estética **esportiva premium + editorial**. O usuário aprovou o mockup da homepage com cabeçalho preto, logo forte, hero escuro com tênis flutuante, indicadores verde-lima, coleções coloridas e cards de lançamentos. A primeira proposta de branding foi a favorita: **NEOX grande, largo, inclinado em off-white/preto; `drop` menor em coral e três marcas diagonais**. As outras propostas fornecem apoio visual, sem substituí-la.

## Identidade visual
| Token provisório | Valor | Uso |
|---|---|---|
| `--brand-ink` | `#151515` | Cabeçalho, textos, botões escuros |
| `--brand-paper` | `#F5F3EF` | Fundo da loja |
| `--brand-sand` | `#D4D3C7` | Seções editoriais |
| `--brand-coral` | `#F23659` | Assinatura drop, badges e promoções |
| `--brand-lime` | `#BDF400` | Interações/CTAs e destaque ativo |
| `--brand-deep-teal` | `#192B30` | Cards performance |
| `--brand-soft-white` | `#FFFFFF` | Contraste e espaços de respiro |

Paleta a validar por contraste WCAG; usar cor decorativa com texto de contraste apropriado. Tipografia: título display **condensado/itálico forte** (usar fonte licenciada ou fallback), texto comum em sans-serif legível. A marca não deve copiar o logotipo da Nike, Adidas ou outro fabricante.

## Navegação e telas

### 1. Homepage (`/`)
- Cabeçalho: **NEOX drop**, menu Início, Tênis, Marcas, Coleções, busca, login/admin discreto e ícone carrinho.
- **Hero editorial**: título do modelo, breve descrição, preço, CTA; tênis grande central; lettering gráfico de fundo; controle para selecionar destaques; contador/progresso.
- Faixa de confiança: **não prometer** frete grátis, parcelamento, trocas ou compra segura como serviço efetivo se o protótipo não oferece esses serviços. Substituir por afirmações verificáveis ("catálogo de tênis", "pedido via WhatsApp", "atendimento a confirmar").
- Coleções: **Street**, **Classics**, **Performance**, em cards de cores próprias e foto com profundidade.
- Lançamentos: grid 4 colunas desktop / 2 tablet / 1–2 mobile, preço BRL e ação.
- Produtos vistos recentemente: dados recuperados via Redis; estado vazio amigável.
- Rodapé: NEOX drop, links úteis e aviso de demonstração acadêmica.

### 2. Catálogo (`/tenis`)
Busca, filtros por marca/categoria/tamanho, ordenação e paginação; não mostrar produtos inativos. Cards podem ter efeito de leve elevação/zoom, mas sem bloquear navegação por teclado.

### 3. Detalhe (`/tenis/{slug}`)
Galeria com foto principal grande, nome, preço, texto, tamanhos BR e estoque visível, seletor de quantidade e adicionar ao carrinho. Modelo 3D opcional como valor adicional; somente no hero é P1 prioritário.

### 4. Carrinho (drawer no desktop, tela adaptada no celular)
Itens com foto, nome, numeração, quantidade, preço, remover; total calculado localmente para feedback e **verificado pelo backend no checkout**. Feedback de estoque/preço alterado ao finalizar. CTA **Pedir pelo WhatsApp**.

### 5. Login administrativo (`/admin/login`)
Formulário limpo e seguro; erros sem revelar se conta existe; login com senha, proteção contra força bruta e opção de sair. Sem cadastro público de admin.

### 6. Administração (`/admin`, `/admin/produtos`)
Listar, criar, editar, desativar e visualizar produtos; campos para SKU, nome, marca, descrição, preço, imagens, categoria, tamanhos/estoque, modelo `.glb` opcional e cores do hero. Mostrar resposta de sucesso/erro e novo produto no catálogo.

## Hero 3D: comportamento obrigatório do diferencial
1. Ao iniciar, exibir capa/imagem imediatamente; carregar `.glb` de modo progressivo, sem bloquear o restante da página.
2. Com modelo carregado, iniciar giro lento ao redor do **eixo vertical Y**, com posição de câmera adequada para ver frente, costas e ambos os lados; **sem inclinação vertical**.
3. Arrastar horizontalmente com mouse ou dedo controla a rotação; arrastar para cima/baixo **não inclina** o tênis. Zoom/pan desligados no hero.
4. Ao clicar em uma miniatura do carrossel, trocar **em conjunto** modelo, nome, preço, descrição, cor do background e marcador selecionado; usar crossfade/pequena transição.
5. Usuário com `prefers-reduced-motion: reduce`: impedir giro automático e remover animações desnecessárias, mas permitir controle manual.
6. Se WebGL/GLB falhar: foto normal e controles de carrossel mantidos, com fallback sem falsa promessa de 3D.
7. `<model-viewer>`: permitir azimute (`theta`) livre para giro; **travar ângulo polar (`phi`)** por `min-camera-orbit` e `max-camera-orbit`, mantendo mesmo valor; testar comportamento no navegador final.
8. Hero 3D funciona somente com arquivo de geometria real, licenciado e acessível, não com uma única foto comum.

## Wireframes textuais
```text
DESKTOP / HOME
+ NEOX drop ------- Início | Tênis | Marcas | Coleções | Busca | Carrinho +
| NEW DROP / 001        [TÊNIS 3D CENTRAL + LETRA GIGANTE AO FUNDO]     |
| Nome + descrição      [carrossel: miniaturas / cores sincronizadas]    |
| Preço + CTA           [setas anterior / próximo, contador de slides]   |
+----------------------------------------------------------------------+
| STREET                 CLASSICS                 PERFORMANCE           |
+----------------------------------------------------------------------+
| LANÇAMENTOS — [tênis] [tênis] [tênis] [tênis]                       |
+----------------------------------------------------------------------+
| VISTOS RECENTEMENTE (REDIS)                                         |
+----------------------------------------------------------------------+
| Rodapé NEOX drop                                                     |
```
```text
MOBILE / HOME
+ NEOX drop --- busca --- carrinho +
| NEW DROP / 001                |
| TÍTULO + PREÇO               |
| [modelo 3D redimensionado]   |
| [miniaturas horizontal scroll]|
| [CTA]                        |
| Coleções (cards verticais)   |
| Lançamentos (2/1 coluna)     |
| Recentes                     |
```

## Qualidade visual e acessibilidade
- Não usar textos fictícios de garantias, avaliações, frete ou 10x sem respaldo.
- Foco visível, navegação por teclado e alt-text nas imagens; hero 3D com alternativa descritiva.
- Layout responsivo 360px–desktop; botões e seletores adequados ao toque.
- Imagens otimizadas WebP/AVIF; poster estático; GLB carregado sob demanda.
- Animar `transform`/`opacity` de preferência; evitar jank; isolar efeitos intensos.
- Performance e acessibilidade devem prevalecer sobre animações decorativas.

## Critérios de aprovação visual
Um visitante reconhece a marca em 5 s; lê nome/preço facilmente; encontra carrinho e CTA; seleciona tênis e troca o destaque sem travamentos; consegue girar o `.glb` **somente de lado**; acessa o catálogo no celular.
