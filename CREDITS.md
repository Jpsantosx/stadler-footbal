# Fontes e créditos

Stadler Football é independente, sem afiliação ou endosso de clubes, ligas, ESPN ou Electronic Arts.

## Clubes, atletas e escudos

O catálogo foi obtido dos feeds públicos de futebol da ESPN em setembro de 2026. Cada clube registra seus identificadores e a origem dos dados em `data/football-catalog.json`.

- [ESPN Futebol](https://www.espn.com/soccer/)
- Catálogo: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams?limit=100`
- Elenco: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/roster`
- Imagens: `https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png`

O build baixa e verifica os 116 escudos em `public/crests/`, preservando suas proporções e transparência. Não são favicons. Nomes, escudos e marcas pertencem aos respectivos titulares; a disponibilidade pública não representa uma licença comercial concedida ao projeto.

Identificação, nome, função, idade e medidas corporais vêm do recorte. OVR, potencial, valores de transferência, salários, contratos, personalidade, moral e finanças são parâmetros próprios da simulação. Talentos das categorias de base são fictícios e identificados como tal na interface.

## Renderização

- [Three.js](https://threejs.org/): renderização 3D, licença MIT.
- Estádio, gramado, desgaste, texturas de uniformes, bola e animações articulares são gerados pelo código.
- As camisas representam cores e padrões característicos; não incluem reproduções completas de patrocinadores nem garantem fidelidade ao uniforme oficial de uma temporada específica.
- React, Next.js, Lucide e demais dependências mantêm suas licenças próprias, disponíveis nos respectivos pacotes.
