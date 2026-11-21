# Assets visuais — origem e licença (T024)

Regra: nenhuma foto, GLB ou poster entra em `app/static/` sem origem, licença e autorização
registradas aqui. Mockups (`docs/reference/visual/04-*.png`) são referência de layout, não
fonte de imagens. Licenças conferidas na página de cada arquivo em 2026-11-20/21.

Atenção: licenças de foto/modelo (CC, CC0, Unsplash, Sketchfab) cobrem o direito autoral da
foto/modelo, **não** as marcas Nike, adidas e New Balance. Decisão final de uso é do responsável.

## Curadoria da vitrine de demonstração (fixtures, sem tocar em bancos)

Ficam só produtos com fotografia real, nítida e do modelo/colorway exato:

| Produto | Vitrine | Motivo |
|---|---|---|
| Nike Air Max 90 Infrared | ✅ | foto CC BY 2.0 correta |
| adidas Samba OG branco/preto/gum | ✅ | 3 fotos (CC0 + Unsplash) corretas |
| Nike Air Max 95 preto/cinza/lima | ❌ retirado | sem foto licenciada da colorway |
| New Balance 9060 cinza | ❌ retirado | sem foto licenciada nem 3D |
| Nike Dunk Low (panda) | ❌ não incluído | só fotos de mão segurando o par (Unsplash), não de produto |
| Produtos fictícios (Volt Runner etc.) e ilustrações SVG | ❌ retirados | ilustrações; SVGs ficam no repo só para testes do admin |

## Fotos incorporadas

| Arquivo | Produto | Fonte | Autor | Licença | Alteração |
|---|---|---|---|---|---|
| `products/nike-air-max-90-infrared/main.webp` | Air Max 90 Infrared | [Commons](https://commons.wikimedia.org/wiki/File:Nike_Air_Max_90_Infrared_(4805905007).jpg) | Christian H. | CC BY 2.0 (crédito obrigatório) | fundo removido (BiRefNet), WebP 1600×1000 |
| `products/adidas-samba-og/main.webp` | Samba OG | [Commons](https://commons.wikimedia.org/wiki/File:Adidas_Samba_OG.jpg) | LeDroider | CC0 | fundo e suporte removidos, WebP |
| `products/adidas-samba-og/lateral.webp` | Samba OG (lateral) | [Unsplash fIflxqqzBQY](https://unsplash.com/photos/a-white-and-black-adidas-sneakers-on-a-wooden-floor-fIflxqqzBQY) | Cris (@cris_23) | Licença Unsplash (uso comercial, sem atribuição obrigatória) | fundo removido, WebP |
| `products/adidas-samba-og/par.webp` | Samba OG (par 3/4) | [Unsplash kpnkWLoM3cE](https://unsplash.com/photos/a-pair-of-white-and-black-shoes-on-a-wooden-floor-kpnkWLoM3cE) | Cris (@cris_23) | Licença Unsplash | fundo removido, WebP |

Crédito exibido no hero (foto) e na página do produto (fotos e 3D), via `attributes.imageCredit`,
`imageCreditUrl`, `model3dCredit`, `model3dCreditUrl`. Recorte offline com `rembg 2.0.67`
(`birefnet-general`) via `uv run --with` no scratchpad; nenhuma dependência no projeto.

Rejeitadas por modelo/cor errados: Commons `Air Max 95.jpg` (outro Air Max), `Nike Air Max 95.png`
(Footshop, colorway Grape), `Air max 90.JPG` (branco/preto); Unsplash "air max 95" (azul/amarelo),
"air max 90 infrared" (rosa), "new balance 9060" (Fresh Foam, 574, 327 — nenhum 9060).

## 3D

O hero e a página do produto abrem com a **foto**; o 3D carrega só ao clicar "Ver em 3D"
(palco `partials/viewer3d.html` + `static/js/viewer3d.js`). Dois motores, ambos com giro só em Y:

- **GLB próprio/licenciado → Model Viewer** (phi fixo, sem zoom/pan, luz `neutral`, nosso fundo,
  sem interface externa). É o caminho de qualidade final assim que houver GLB com licença comercial.
- **Embed Sketchfab** (Viewer API 1.12.1): usado hoje para AM90 e Samba. Limites: o plano gratuito
  não permite esconder o logo/dica do player nem ajustar luz; o giro Y é nossa camada de arraste.

| Modelo | Estado | Fonte | Licença |
|---|---|---|---|
| Air Max 90 Infrared | 3D real via embed | [Sketchfab c375a769…](https://sketchfab.com/3d-models/c375a769712e4ddebb2f48f1f12b99a2), alitvinenkoo13 | **Editorial** |
| Samba OG B75806 | 3D real via embed | [Sketchfab 974e037f…](https://sketchfab.com/3d-models/974e037fd4424961b1928f7fa1e72ceb), trargus | **Editorial** |
| Air Max 95 NDSTRKT | embed existe, produto fora da vitrine (sem foto) | [Sketchfab 41c2a1ed…](https://sketchfab.com/3d-models/41c2a1ed281542c58529fe5593c97012), trargus | **Editorial** |
| New Balance 9060 cinza | **sem 3D** | nenhum gratuito; "9060r" do Sketchfab é um 1906R | — |

**Risco a decidir:** a licença Editorial do Sketchfab proíbe uso comercial/promocional dos
arquivos. O embed é exibido pelo player do próprio Sketchfab (não baixamos nada), mas uma loja
que vende os pares é uso comercial; recomendamos substituir por GLB com licença comercial ou
escaneamento próprio antes de publicar.

### Opções para aprovação (nada foi comprado)

Preços vistos em busca em 2026-11-21; confirmar na página antes de qualquer compra. Modelos de
marca em marketplaces costumam vir marcados "editorial use only" — exigir licença comercial
explícita (Royalty Free / Standard) antes de comprar.

| Produto | Opção | Preço visto | Observação |
|---|---|---|---|
| New Balance 9060 | TurboSquid "New Balance 9060 sneaker" (Blender, Exclusive) | US$ 29 (+ tiers de licença US$ 99–429) | colorway e licença a confirmar |
| New Balance 9060 | CGTrader "New Balance 9060 sea salt" | não confirmado | colorway sea salt, não cinza |
| Air Max 95 | CGTrader pacote 3 colorways (Neon green / All black / All white) | US$ 28,99 | não é a preto/lima NDSTRKT |
| Air Max 95 | TurboSquid Air Max 95 Neon PBR | US$ 49 | provavelmente editorial |
| Air Max 90 Infrared | CGTrader "NIKE - AIR MAX 90 - INFRARED" (3D print) | não confirmado | malha para impressão, sem PBR provável |
| Samba OG | CGTrader Samba OG (colorway azul) | US$ 45 | colorway errada |
| Qualquer um | **Escanear os pares do estoque** (fotogrametria por app de celular → GLB → Model Viewer) | grátis a ~US$ 15/mês de app | colorway exata e direito autoral próprio; qualidade boa, não de configurador |
| Qualquer um | Encomendar modelagem/escaneamento profissional | orçamento | qualidade de configurador; custo alto |

## Especificação técnica para novas fotos

| Uso | Formato | Tamanho | Fundo | Campo |
|---|---|---|---|---|
| Hero, card, galeria | WebP com alfa | 1600×1000, tênis ~90% da largura, chão a 88% da altura | transparente | `mainImageUrl` / `galleryUrls` |

- Vista lateral com bico à esquerda na foto principal; outros ângulos na galeria.
- Nome, marca e `colorName` devem corresponder ao par fotografado.
- Arquivos em `app/static/images/products/<slug>/`; registrar cada um nesta tabela.
