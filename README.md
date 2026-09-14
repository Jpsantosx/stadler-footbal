# Stadler Football 3D

Jogo de futebol 8×8 para navegador, construído com React, TypeScript e Canvas 2D. O motor prioriza realismo tático, individualidade por atributos e uma apresentação imersiva.

## Jogar e ver o código

- Jogo público na Vercel: [stadler-footbal.vercel.app](https://stadler-footbal.vercel.app)
- Espelho no ChatGPT Sites: [stadler-football-3d.joaopedrostadl554190.chatgpt.site](https://stadler-football-3d.joaopedrostadl554190.chatgpt.site)
- Código-fonte: [github.com/Jpsantosx/stadler-footbal](https://github.com/Jpsantosx/stadler-footbal)

## O que foi implementado

### Partida, regras e tática

- 8 jogadores por time, com formações `2-3-2`, `3-2-2` e `2-2-3` adaptadas ao campo reduzido
- posturas Equilibrada, Ofensiva, Defensiva e Contra-ataque
- IA com zonas rígidas por função: atacantes não perseguem a bola até a própria zaga, zagueiros protegem sua linha e meio-campistas conectam os setores
- linha, largura, pressão, compactação, apoio e corridas mudam dinamicamente com a formação, a posse e a postura escolhida
- partida completa de **1 minuto e 50 segundos**, dividida em dois tempos de 55 segundos
- saída de bola no centro, troca de lados no intervalo e reinício central após gol
- impedimento, lateral, escanteio, tiro de meta, falta, pênalti, amarelo e vermelho
- passe, chute carregado/colocado, bote, roubo, troca de jogador e carrinho
- goleiro com leitura de trajetória, saída, mergulho, rebote e distribuição; reação ajustada para permitir uma taxa de gols mais equilibrada

### OVR e elencos

- velocidade máxima, aceleração, agilidade, passe, finalização, domínio, bote, alcance do carrinho e reação do goleiro são calculados pelo OVR e pelos atributos do atleta
- perfis de jogador (criador, finalizador, velocista, motor e marcador) alteram decisões e movimentação da IA
- cada disputa compara diretamente os jogadores envolvidos: defensor contra o controle do atacante e finalizador contra o goleiro
- o OVR do time é a média real dos oito titulares e também compara a força dos dois elencos; equipes mais qualificadas ficam perceptivelmente mais fortes sem tornar o resultado automático
- escalações compactas com 8 atletas de 24 clubes brasileiros e europeus
- seletor de clubes com filtros para Brasileirão e Europa, nome, liga e OVR da escalação
- seletor funcional de liga e matchmaking estrito: campeonato e carreira só permitem confrontos entre clubes da competição escolhida
- tabela completa da liga com jogos, vitórias, empates, derrotas, gols pró, gols contra, saldo e pontos
- escudos carregados a partir dos domínios oficiais com fallback interno, além de uniformes desenhados com cores, calções, meiões e padrões característicos de cada clube

Os dados de elenco são um recorte editável no objeto `ROSTERS`, em `app/football-game.tsx`. Transferências reais mudam durante a temporada, então o projeto não promete atualização automática em tempo real.

### Modos

- **Amistoso:** partida rápida contra IA ou para 2 jogadores locais
- **Liga:** escolha da competição, adversários da mesma liga e tabela de pontos corridos organizada
- **Copa:** mata-mata continental (Libertadores/Champions) ou Mundial de Clubes, com quartas, semifinal e final
- **Carreira:** orçamento proporcional ao clube, torcida, resultados, compras e vendas atômicas, titulares e reservas; o save fica no `localStorage` do navegador

## Como o código está organizado

| Etapa           | Código principal                                   | Responsabilidade                                                |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Elencos e OVR   | `ROSTERS`, `attributeProfile`, `lineupFor`         | Transforma OVR em atributos e escolhe os titulares por posição  |
| Formações       | `FORMATIONS`, `TACTICS`, `roleProgressBounds`, `aiTarget` | Define âncoras, zonas por função e deslocamento tático      |
| Física e regras | `updateMatch`, `updateBall`, `resolveSlideTackles` | Integra movimento, bola, colisões, faltas e reinícios           |
| Goleiro         | `updateKeeper`, `resolveKeeperSmothers`            | Prevê trajetória, decide saída e calcula defesa/rebote          |
| Competições     | `leagueTeamsFor`, `simulateLeagueRound`, estado de copa e carreira | Filtra ligas, atualiza tabela, mata-mata e caixa |
| Mercado         | `completePurchase`, `completeSale`, `lineupFor`    | Aplica caixa, plantel e escalação em uma única operação         |
| Interface       | componente `FootballGame` e `app/globals.css`      | Menu, HUD, mercado, responsividade e níveis gráficos            |

## Controles

| Ação           | Jogador 1    | Jogador 2    |
| -------------- | ------------ | ------------ |
| Movimento      | `WASD`       | Setas        |
| Correr         | `Shift`      | `Enter`      |
| Passe          | `F`          | `K`          |
| Chute          | `Espaço`     | `L`          |
| Roubar         | `E`          | `J`          |
| Trocar jogador | `Q`          | `I`          |
| Carrinho       | `R`          | `U`          |
| Pausar         | `P` ou `Esc` | `P` ou `Esc` |

No celular, use o analógico virtual e os botões de ação exibidos na tela.

## Executar localmente

Requisito: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Validação e produção:

```bash
npm run build
npm test
npm run start
```

Na Vercel, o arquivo `vercel.json` seleciona o build Next.js nativo com
`npm run build:vercel`, sem remover o build Vinext usado pelo ChatGPT Sites.

As instruções completas para publicar em um servidor estão em [DEPLOY.md](./DEPLOY.md).

## Arquivos principais

- `app/football-game.tsx`: motor, regras, IA, modos e interface
- `app/globals.css`: visual, HUD, menus, mercado e controles responsivos
- `app/page.tsx`: página principal
- `tests/*.test.mjs`: verificações de renderização e componentes
- `Dockerfile`: implantação em serviços compatíveis com contêiner

## Identidade visual e licenças

Este é um projeto independente e educacional, sem vínculo com clubes, ligas ou publicadoras. Os menus consultam os favicons publicados pelos domínios oficiais; se a rede falhar, o jogo usa um emblema tipográfico interno. Os uniformes são desenhados pelo próprio motor, sem patrocinadores. Nomes, escudos e marcas continuam pertencendo aos respectivos titulares. Consulte [CREDITS.md](./CREDITS.md) antes de redistribuir ou usar comercialmente.
