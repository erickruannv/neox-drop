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
| Nike Air Max 95 Dark Army/Orange Blaze | ✅ destaque 1 | scan 3D fotogramétrico CC BY; imagens = capturas do scan (ver abaixo) |
| Nike Air Max 95 OG Neon preto/cinza/lima | ❌ sem foto | nenhuma foto/scan com licença comercial da colorway; o Dark Army é a alternativa apresentada |
| New Balance 9060 cinza | ❌ retirado | sem foto licenciada nem 3D |
| Nike Dunk Low (panda) | ❌ não incluído | só fotos de mão segurando o par (Unsplash), não de produto |
| Produtos fictícios (Volt Runner etc.) e ilustrações SVG | ❌ retirados | ilustrações; SVGs ficam no repo só para testes do admin |

## Fotos incorporadas

| Arquivo | Produto | Fonte | Autor | Licença | Alteração |
|---|---|---|---|---|---|
| `products/nike-air-max-90-infrared/main.webp` | Air Max 90 Infrared | [Commons](https://commons.wikimedia.org/wiki/File:Nike_Air_Max_90_Infrared_(4805905007).jpg) | Christian H. | CC BY 2.0 (crédito obrigatório) | fundo removido (BiRefNet), WebP 1600×1000; em 2026-11-23 removido resto do 2º pé do par atrás do cano |
| `products/adidas-samba-og/main.webp` | Samba OG | [Commons](https://commons.wikimedia.org/wiki/File:Adidas_Samba_OG.jpg) | LeDroider | CC0 | fundo e suporte removidos, WebP |
| `products/adidas-samba-og/lateral.webp` | Samba OG (lateral) | [Unsplash fIflxqqzBQY](https://unsplash.com/photos/a-white-and-black-adidas-sneakers-on-a-wooden-floor-fIflxqqzBQY) | Cris (@cris_23) | Licença Unsplash (uso comercial, sem atribuição obrigatória) | fundo removido, WebP |
| `products/nike-air-max-95-dark-army/{lateral,frente34,medial,tras34}.webp` | Air Max 95 Dark Army/Orange Blaze | [Sketchfab c425a652…](https://sketchfab.com/3d-models/c425a652fc59427ba1fcef48ea174c92) | Andre Bond Sr. | CC BY 4.0 (crédito obrigatório) | **capturas do scan 3D** (Viewer API, fundo transparente), sombra removida, brilho +12%, WebP 1600×1000 — identificadas como captura, não como foto |
| `products/adidas-samba-og/par.webp` | Samba OG (par 3/4) | [Unsplash kpnkWLoM3cE](https://unsplash.com/photos/a-pair-of-white-and-black-shoes-on-a-wooden-floor-kpnkWLoM3cE) | Cris (@cris_23) | Licença Unsplash | fundo removido, WebP |

Crédito exibido no hero (foto) e na página do produto (fotos e 3D), via `attributes.imageCredit`,
`imageCreditUrl`, `model3dCredit`, `model3dCreditUrl`. Recorte offline com `rembg 2.0.67`
(`birefnet-general`) via `uv run --with` no scratchpad; nenhuma dependência no projeto.

Rejeitadas (2026-11-22): Flickr chrishimself 4805905873/4805905383 (AM90 Infrared, CC BY, mas
detalhes desfocados dentro da caixa); Flickr PaFFaS "New Balance 9060 burgunderrot" (PDM, cor
errada e conta de fetiche de pés); Commons Ksharks2 Samba (CC BY-SA, dispensável: Samba já tem 3
fotos). Busca feita no Openverse (Flickr + Commons, `license_type=commercial`).

Rejeitadas por modelo/cor errados: Commons `Air Max 95.jpg` (outro Air Max), `Nike Air Max 95.png`
(Footshop, colorway Grape), `Air max 90.JPG` (branco/preto); Unsplash "air max 95" (azul/amarelo),
"air max 90 infrared" (rosa), "new balance 9060" (Fresh Foam, 574, 327 — nenhum 9060).

## 3D

O hero e a página do produto abrem com a **foto**; o 3D do mesmo produto só carrega quando a pessoa
interage com a foto (arraste horizontal, toque ou pílula "Girar 360°") e aparece no lugar dela quando
fica pronto (`static/js/viewer3d.js`, `partials/rotate3d.html`). Giro só em Y (camada de arraste própria
sobre o embed; GLB futuro via Model Viewer com phi fixo). Produto sem `model3dUrl` não mostra convite.

**Escolhido (2026-11-22): um único modelo, fotorrealista.** Avaliado no Chromium com GPU, em
vários ângulos, não só "carregou":

| Modelo | Decisão | Fonte | Licença | Motivo |
|---|---|---|---|---|
| Nike Air Max 95 Dark Army/Orange Blaze | ✅ **em uso** (destaque 1) | [Sketchfab c425a652…](https://sketchfab.com/3d-models/c425a652fc59427ba1fcef48ea174c92), Andre Bond Sr. | CC BY 4.0 | fotogrametria; camurça, malha, costura e bolhas de ar com aparência de foto |
| Nike Air Max 90 Essentials Olive | reserva | [Sketchfab feaf8296…](https://sketchfab.com/3d-models/feaf82967c5f44bd94aa774228d76d21), Andre Bond Sr. | CC BY 4.0 | fotorrealista (250 fotos, Reality Capture), mas sem foto da colorway |
| Nike Air Max 90 preto/branco/vermelho | reserva | [Sketchfab ce4a4e58…](https://sketchfab.com/3d-models/ce4a4e5847b34cd6b4ed0ecf134f556d), Thomson | CC BY 4.0 | scan KIRI bom, 12k vértices; não é a Infrared branca |
| Nike Air Max 90 (Raw) — link do pedido | ❌ | [Sketchfab fe4211e3…](https://sketchfab.com/3d-models/fe4211e3fb0d43eab4bd29a6b1471243) | CC BY | scan cru: chão e suporte junto, sola derretida |
| NIKE "Our first complete 3D scan" — link do pedido | ❌ | [Sketchfab ef0609eb…](https://sketchfab.com/3d-models/ef0609ebc279443bad0c07694c6790b2) | CC BY | bom scan, mas é um Air Force 1 Shadow (fora dos modelos) |
| innerscene "running sneaker" — link do pedido | ❌ | [innerscene c7a5a7eb](https://www.innerscene.com/tools/library/3d-parts/running-sneaker-c7a5a7eb) | CC0 (GLB 11,9 MB grátis) | tênis genérico modelado (não scan), sem marca: mostrá-lo seria produto inventado |
| Air Max 95 Animal / Air Max 95 David4K | ❌ | Sketchfab 638fc15f… / b2589d82… | CC BY | colorway animal; o outro é malha branca sem textura |
| Old Adidas Samba (scan) | ❌ | Sketchfab b23ee595… | CC BY | Samba preto e gasto, fundo de ambiente junto |
| AM90 c375a769… e Samba 974e037f… (usados antes) | ❌ **removidos** | Sketchfab | **Editorial** | visual de jogo e licença não comercial |
| New Balance 9060 | ❌ nenhum | busca Sketchfab | — | nenhum 9060 com licença livre |

Licença do AM95 reconfirmada em 2026-11-22 pela API pública do Sketchfab
(`/v3/models/c425a652…`): `CC Attribution` → https://creativecommons.org/licenses/by/4.0/,
"Author must be credited. Commercial use is allowed.", autor Andre Bond Sr. (@leadblacktech).
Aprovado pelo responsável como 3D principal. Crédito exibido no palco 3D, no hero e no produto;
as alterações (captura, fundo removido) constam no crédito das imagens, como pede a CC BY 4.0.

Observações:
- A descrição do AM95 diz "Purchase on Sketchfab only", mas a página publica licença **CC BY** e
  download liberado. Usamos só o **embed** oficial com crédito; antes de baixar/hospedar o GLB,
  confirmar com o autor.
- Plano gratuito do Sketchfab: título, logo e dica "click & hold" do player continuam visíveis
  (esconder exige Pro). Sem rotação nativa: o iframe é `inert`, o giro é nosso, só em Y.
- Celular: na emulação headless as texturas HD saem salpicadas (o embed puro também); conferir em
  aparelho real.

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

## Alternativas propostas (não incorporadas — aguardam aprovação)

Arquivos já preparados (recorte BiRefNet, WebP 1600×1000, fundo transparente) mas **não ligados à
vitrine**: `products/new-balance-2002r/main.webp`, `products/nike-dunk-low-vermelho-cinza/main.webp` e
`products/new-balance-574-cinza/main.webp`.
Licença CC0 reconfirmada na API do Commons em 2026-11-23. Dados prontos (ProductCreate) em
`docs/catalogo-definitivo.json` → `alternativas_aguardando_aprovacao`. New Balance 9060: nova busca em
2026-11-23 (Openverse/Flickr, categorias do Commons) sem resultado utilizável.

Sem foto utilizável para **Air Max 95 OG Neon** e **New Balance 9060 cinza** (buscados em
Commons, Flickr via Openverse, Unsplash e Pexels em 2026-11-21/22). Fotos reais encontradas para
substituir, se aprovado:

| No lugar de | Alternativa | Fonte | Licença | Observação |
|---|---|---|---|---|
| New Balance 9060 cinza | New Balance 2002R (camurça lilás/cinza, par) | [Commons, LeDroider](https://commons.wikimedia.org/w/index.php?curid=149192395) | CC0 | 2335×2424, foto de produto nítida; mesmo autor da foto do Samba |
| (extra) | Nike Dunk Low vermelho/cinza (par) | [Commons, William Mucci](https://commons.wikimedia.org/w/index.php?curid=99442772) | CC0 | 2963×3523, fundo claro liso |
| (extra) | New Balance 574 cinza (pé único, lateral) | [Commons, LeDroider](https://commons.wikimedia.org/w/index.php?curid=153859594) | CC0 | 3136×1826, vitrine de loja; recorte em `products/new-balance-574-cinza/main.webp` (2026-11-23) |
| (reserva, sem recorte) | adidas Gazelle Indoor azul (par) | [Commons, LeDroider](https://commons.wikimedia.org/w/index.php?curid=148699790) | CC0 | 3688×2725, par lateral sobre madeira |

O Air Max 95 já tem o Dark Army (3D + capturas) como representante aprovado.

## Especificação técnica para novas fotos

| Uso | Formato | Tamanho | Fundo | Campo |
|---|---|---|---|---|
| Hero, card, galeria | WebP com alfa | 1600×1000, tênis ~90% da largura, chão a 88% da altura | transparente | `mainImageUrl` / `galleryUrls` |

- Vista lateral com bico à esquerda na foto principal; outros ângulos na galeria.
- Nome, marca e `colorName` devem corresponder ao par fotografado.
- Arquivos em `app/static/images/products/<slug>/`; registrar cada um nesta tabela.
