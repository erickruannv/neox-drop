# Assets visuais — origem e licença (T024)

Regra: nenhuma foto, GLB ou poster entra em `app/static/` sem origem, licença e autorização
registradas aqui. Mockups (`docs/reference/visual/04-*.png`) são referência de layout, não
fonte de imagens.

## Em uso hoje

| Arquivo | Origem | Licença | Observação |
|---|---|---|---|
| `app/static/images/demo/*.svg` | Ilustrações vetoriais próprias do projeto | Próprias | Sem marcas de fabricante. Só fixtures/demo. |

Nenhum GLB licenciado. RF-13 não está pronto.

## Candidatos para aprovação (NÃO incorporados)

Status: aguardando decisão do responsável. Levantamento de 2026-11-20. A licença de cada arquivo
deve ser conferida na página do arquivo antes do uso.

### A. Fotografia própria dos pares em estoque (recomendado)

- Fotografar os tênis que a loja de fato vende, em fundo branco ou recortados.
- Direito autoral é da loja/fotógrafo contratado; imagem corresponde exatamente ao produto
  vendido (modelo, cor, numeração).
- Ainda assim, logotipos de fabricante na foto continuam sendo marca de terceiros; uso para
  vender o próprio par original é prática comum de revenda, mas confirmar com o responsável.

### B. Imagens oficiais do fabricante/distribuidor

- Nike, adidas, New Balance fornecem fotos de produto a revendedores autorizados, sob contrato.
- Só usar com acordo de revenda que inclua uso das imagens. Sem acordo: não usar.
- Sites de lojas, Google Imagens e Pinterest: proibido (direitos não verificáveis).

### C. Wikimedia Commons (licença de direito autoral verificável por arquivo)

Limitações: fotos amadoras com fundo (não são recorte de estúdio); a licença cobre a foto, não
as marcas Nike/adidas; CC BY-SA exige atribuição visível e derivados (ex.: fundo removido) sob
a mesma licença.

| Modelo | Arquivo | Licença indicada na busca |
|---|---|---|
| adidas Samba OG | [Adidas Samba OG.jpg](https://commons.wikimedia.org/wiki/File:Adidas_Samba_OG.jpg) | CC0 |
| adidas Samba | [Adidas Samba sneakers, Originals branch.JPG](https://commons.wikimedia.org/wiki/File:Adidas_Samba_sneakers,_Originals_branch.JPG) | Domínio público (autor) |
| adidas Samba | [Adidas Samba.jpg](https://commons.wikimedia.org/wiki/File:Adidas_Samba.jpg) | CC BY-SA 4.0 (foto em loja) |
| adidas Samba | [Adidas Samba original sneaker March- 2024.jpg](https://commons.wikimedia.org/wiki/File:Adidas_Samba_original_sneaker_March-_2024.jpg) | CC BY-SA 4.0 |
| Nike Air Max 95 | [Air Max 95.jpg](https://commons.wikimedia.org/wiki/File:Air_Max_95.jpg) | CC BY-SA 4.0 |
| Nike Air Max 95 | [Nike Air Max 95.png](https://commons.wikimedia.org/wiki/File:Nike_Air_Max_95.png) | conferir na página |
| Nike Air Max (vários) | [Category:Nike Air Max](https://commons.wikimedia.org/wiki/Category:Nike_Air_Max) | por arquivo |

Air Max 90, Dunk Low e New Balance 9060 do mockup: sem candidato verificado ainda.

### D. Bancos gratuitos (Unsplash/Pexels)

A licença permite uso comercial da foto, mas
[não cobre marcas e logotipos visíveis](https://help.unsplash.com/en/articles/2612329-releases-and-trademarks).
Fotos de tênis de marca nesses bancos: não recomendado para página de venda.

## Especificação técnica para quando houver fotos aprovadas

| Uso | Formato | Tamanho | Fundo | Campo |
|---|---|---|---|---|
| Hero (fundo escuro) | WebP/AVIF com alfa (PNG aceito) | ~1600×772, recorte ocupa ~90% da largura | **Transparente obrigatório** | `mainImageUrl` do destaque |
| Card/catálogo | WebP | 1200×800 (3:2) | Branco ou transparente | `mainImageUrl` |
| Galeria do produto | WebP | 1200×900 (4:3) | Branco ou transparente | `galleryUrls` |

- Vista lateral 3/4, bico para a direita, mesma escala e altura de chão em todas as fotos.
- A UI usa `object-contain` em molduras fixas: qualquer proporção cabe sem desalinhar cards.
- Hero aplica sombra pelo contorno: foto com fundo opaco aparece como retângulo no fundo escuro.
- Nome, marca e `colorName` do produto devem corresponder ao par fotografado.
- Arquivos em `app/static/images/products/<slug>/` ou URL https; registrar cada um nesta tabela.
