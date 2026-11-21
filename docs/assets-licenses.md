# Assets visuais — origem e licença (T024)

Regra: nenhuma foto, GLB ou poster entra em `app/static/` sem origem, licença e autorização
registradas aqui. Mockups (`docs/reference/visual/04-*.png`) são referência de layout, não
fonte de imagens. Licenças conferidas na página/API de cada arquivo em 2026-11-20.

Atenção: licença de direito autoral (CC, CC0, embed) cobre a foto/modelo, **não** as marcas
Nike, adidas e New Balance que aparecem neles. Uso em página de venda de pares originais é
prática comum de revenda, mas a decisão final é do responsável.

## Fotos incorporadas

| Arquivo | Produto | Fonte | Autor | Licença | Alteração |
|---|---|---|---|---|---|
| `app/static/images/products/nike-air-max-90-infrared/main.webp` | Nike Air Max 90 Infrared | [Commons: Nike Air Max 90 Infrared (4805905007).jpg](https://commons.wikimedia.org/wiki/File:Nike_Air_Max_90_Infrared_(4805905007).jpg) | Christian H. | CC BY 2.0 (atribuição obrigatória) | fundo removido (BiRefNet), recorte, WebP 1600×1000 |
| `app/static/images/products/adidas-samba-og/main.webp` | adidas Samba OG branco/preto/gum | [Commons: Adidas Samba OG.jpg](https://commons.wikimedia.org/wiki/File:Adidas_Samba_OG.jpg) | LeDroider | CC0 | fundo e suporte de vitrine removidos, WebP 1600×1000 |
| `app/static/images/products/foto-pendente.svg` | marcador neutro | próprio | — | próprio | sem marca; usado onde não há foto licenciada |
| `app/static/images/demo/*.svg` | produtos fictícios | próprio | — | próprio | só demo |

Atribuição exibida: hero (linha de crédito sob o tênis) e página do produto (lista de créditos),
a partir de `attributes.imageCredit`/`imageCreditUrl` do produto.

Ferramenta de recorte (offline, fora do projeto): `rembg 2.0.67` modelo `birefnet-general`,
executado via `uv run --with` no scratchpad; nenhuma dependência adicionada ao projeto.

### Sem foto licenciada (marcador "Foto em produção")

- **Nike Air Max 95 preto/cinza/verde-lima**: Commons só tem `Air Max 95.jpg` (domínio
  público, mas mostra outro Air Max, não o 95) e `Nike Air Max 95.png` (Footshop, CC BY-SA 4.0,
  colorway Grape, cor errada). Rejeitados para não associar foto errada.
- **New Balance 9060 cinza**: nenhum arquivo no Commons; Openverse só tem um 9060 vinho (PDM).
- Rejeitados também: `Air max 90.JPG` (domínio público, colorway branco/preto, não Infrared).

## Modelos 3D (embed oficial Sketchfab)

Os arquivos não são baixados nem hospedados: o download do Sketchfab exige conta/token e a
maioria destes modelos é paga (licença Editorial). Usamos o **player de embed** do Sketchfab,
que o autor permite para modelos públicos (oEmbed/`/embed` respondem 200), via Viewer API
1.12.1. A marca Sketchfab, o título e o autor aparecem no próprio player.

| Produto | Modelo Sketchfab | Autor | Licença da loja Sketchfab | Estado |
|---|---|---|---|---|
| Nike Air Max 95 preto/cinza/verde-lima | [Nike Air Max 95 NDSTRKT_CZ3591-002](https://sketchfab.com/3d-models/41c2a1ed281542c58529fe5593c97012) | trargus | Editorial (download pago, não comprado) | **3D real via embed** |
| Nike Air Max 90 Infrared | [Nike Air Max 90 (4K & UHD) Sneakers Red](https://sketchfab.com/3d-models/c375a769712e4ddebb2f48f1f12b99a2) | alitvinenkoo13 | Editorial (download pago, não comprado) | **3D real via embed** |
| adidas Samba OG B75806 | [adidas Originals Samba OG B75806](https://sketchfab.com/3d-models/974e037fd4424961b1928f7fa1e72ceb) | trargus | Editorial (download pago, não comprado) | **3D real via embed** |
| New Balance 9060 cinza | — | — | — | **Sem modelo 3D** |

9060: o único resultado "New Balance 9060r" (v.isual.l) é na verdade um **1906R** (texto
"1906R" visível na lateral) e é "preview only"; "9060" de leopoly1 é de 2015 (o tênis é de
2022). Não substituímos por outro tênis. Caminhos legítimos: (a) foto-/escaneamento 3D do par
em estoque (ex.: app de fotogrametria) e otimização no Blender para GLB; (b) comprar/licenciar
um modelo em loja 3D (exige aprovação de custo); (c) encomendar modelagem.

Limites conhecidos do embed (plano gratuito do Sketchfab):
- `ui_*` e `orbit_constraint_*` só funcionam em conta Pro: a interface do player (título,
  ícones, dica "click & hold") aparece e some sozinha após alguns segundos.
- Por isso o giro só em Y é nosso: uma camada sobre o iframe captura mouse/toque/teclado e
  chama `setCameraLookAt` girando em torno do eixo vertical; o iframe é `inert`.
- Iluminação e sombra são as da cena do autor (não ajustáveis sem conta Pro).
- Precisa de rede e WebGL; sem isso a foto/marcador continua visível.

`model3dUrl` guarda `https://sketchfab.com/models/<uid>/embed` (o contrato aceita qualquer
https; o backend precisa liberar a origem `sketchfab.com` na allowlist). Crédito em
`attributes.model3dCredit`/`model3dCreditUrl`.

## Especificação técnica para novas fotos

| Uso | Formato | Tamanho | Fundo | Campo |
|---|---|---|---|---|
| Hero, card e galeria (mesma imagem) | WebP com alfa | 1600×1000, tênis ~90% da largura, chão a 88% da altura | **Transparente** | `mainImageUrl` / `galleryUrls` |

- Vista lateral, bico para a esquerda (padrão atual das fotos), mesma escala em todas.
- A UI usa `object-contain` em molduras fixas: qualquer proporção cabe sem desalinhar cards.
- Nome, marca e `colorName` do produto devem corresponder ao par fotografado.
- Arquivos em `app/static/images/products/<slug>/`; registrar cada um nesta tabela.
