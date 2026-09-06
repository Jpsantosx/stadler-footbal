# Stadler Football 3D

Jogo de futebol 8×8 para navegador, construído com React, TypeScript e Canvas 2D. O motor prioriza resposta rápida, física legível e boa taxa de quadros mesmo em computadores mais simples.

## Jogar e ver o código

- Jogo público: [stadler-football-3d.joaopedrostadl554190.chatgpt.site](https://stadler-football-3d.joaopedrostadl554190.chatgpt.site)
- Código-fonte: [github.com/Jpsantosx/stadler-footbal](https://github.com/Jpsantosx/stadler-footbal)

## O que foi implementado

### Partida, regras e tática

- 8 jogadores por time, com formações `2-3-2`, `3-2-2` e `2-2-3` adaptadas ao campo reduzido
- posturas Equilibrada, Ofensiva, Defensiva e Contra-ataque
- IA posicionada por âncora tática: linha, largura, pressão, apoio e corridas mudam de acordo com o plano escolhido
- partida completa de **1 minuto e 50 segundos**, dividida em dois tempos de 55 segundos
- saída de bola no centro, troca de lados no intervalo e reinício central após gol
- impedimento, lateral, escanteio, tiro de meta, falta, pênalti, amarelo e vermelho
- passe, chute carregado/colocado, bote, roubo, troca de jogador e carrinho
- goleiro com leitura de trajetória, saída, mergulho, rebote e distribuição; reação ajustada para permitir uma taxa de gols mais equilibrada

### OVR e elencos

- velocidade, passe, finalização, domínio, desarme, carrinho e reação do goleiro são calculados pelo OVR e pelos atributos do atleta
- cada disputa compara diretamente os jogadores envolvidos: defensor contra o controle do atacante e finalizador contra o goleiro
- o OVR do time é a média real dos oito titulares e também compara a força dos dois elencos; equipes mais qualificadas ficam perceptivelmente mais fortes sem tornar o resultado automático
- escalações compactas com 8 atletas de 24 clubes brasileiros e europeus
- seletor de clubes com filtros para Brasileirão e Europa, nome, liga e OVR da escalação
- tabela completa de oito clubes com jogos, vitórias, empates, derrotas, saldo e pontos
- bandeiras de país, flâmulas, uniformes e emblemas estilizados pelas cores de cada clube

Os dados de elenco são um recorte editável no objeto `ROSTERS`, em `app/football-game.tsx`. Transferências reais mudam durante a temporada, então o projeto não promete atualização automática em tempo real.

### Modos

- **Amistoso:** partida rápida contra IA ou para 2 jogadores locais
- **Liga:** tabela de pontos corridos, rodada, vitórias, empates, derrotas, saldo e classificação
- **Copa:** mata-mata continental (Libertadores/Champions) ou Mundial de Clubes, com quartas, semifinal e final
- **Carreira:** orçamento, torcida, resultados, contratações e vendas; o save fica no `localStorage` do navegador

## Como o código está organizado

| Etapa           | Código principal                                   | Responsabilidade                                                |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Elencos e OVR   | `ROSTERS`, `attributeProfile`, `lineupFor`         | Transforma OVR em atributos e escolhe os titulares por posição  |
| Formações       | `FORMATIONS`, `TACTICS`, `aiTarget`                | Define âncoras e limita o deslocamento da IA ao plano escolhido |
| Física e regras | `updateMatch`, `updateBall`, `resolveSlideTackles` | Integra movimento, bola, colisões, faltas e reinícios           |
| Goleiro         | `updateKeeper`, `resolveKeeperSmothers`            | Prevê trajetória, decide saída e calcula defesa/rebote          |
| Competições     | `simulateLeagueRound`, estado de copa e carreira   | Atualiza tabela, mata-mata, caixa e histórico                   |
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

As instruções completas para publicar em um servidor estão em [DEPLOY.md](./DEPLOY.md).

## Arquivos principais

- `app/football-game.tsx`: motor, regras, IA, modos e interface
- `app/globals.css`: visual, HUD, menus, mercado e controles responsivos
- `app/page.tsx`: página principal
- `tests/*.test.mjs`: verificações de renderização e componentes
- `Dockerfile`: implantação em serviços compatíveis com contêiner

## Identidade visual e licenças

Este é um projeto independente e educacional, sem vínculo com clubes, ligas ou publicadoras. Escudos e uniformes oficiais são ativos licenciados; por isso o repositório distribui identidades originais estilizadas, sem copiar os arquivos oficiais. Para usar material oficial, obtenha autorização dos detentores e substitua os componentes `TeamBadge`, `TeamFlag` e o desenho dos uniformes.
