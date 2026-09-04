# Stadler Football 3D

Jogo de futebol para navegador feito com React, TypeScript e Canvas 2D. O foco é oferecer partidas rápidas, física responsiva e boa taxa de quadros até em computadores mais simples.

## Jogar

Versão publicada: [stadler-football-3d.joaopedrostadl554190.chatgpt.site](https://stadler-football-3d.joaopedrostadl554190.chatgpt.site)

## Recursos

- 8 contra 8 com clubes brasileiros e europeus
- modo solo contra a IA e modo local para 2 jogadores
- dois tempos de 3 minutos e troca de lados no intervalo
- saída de bola no círculo central após início, intervalo e gols
- impedimento e tiro livre indireto
- laterais, escanteios, tiros de meta, faltas e pênaltis
- cartões amarelos, segundo amarelo e vermelho direto
- passes, chutes carregados, roubadas e carrinhos
- bola com altura, quique, curva, atrito, bloqueios e colisão nas traves
- goleiros com leitura de trajetória, saída do gol, defesa e distribuição
- três níveis gráficos, controles por teclado e controles de toque

## Controles

| Ação | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Movimento | `WASD` | Setas |
| Correr | `Shift` | `Enter` |
| Passe | `F` | `K` |
| Chute | `Espaço` | `L` |
| Roubar | `E` | `J` |
| Trocar jogador | `Q` | `I` |
| Carrinho | `R` | `U` |
| Pausar | `P` ou `Esc` | `P` ou `Esc` |

No celular, use o analógico virtual e os botões de ação exibidos na tela.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## Estrutura principal

- `app/football-game.tsx`: motor da partida, regras, IA, física, desenho e interface
- `app/globals.css`: estilo, HUD, menus e controles responsivos
- `app/page.tsx`: página principal do jogo
- `app/layout.tsx`: metadados e layout global

## Aviso

Projeto independente e educacional. Não utiliza escudos oficiais e não possui vínculo com clubes, ligas ou publicadoras de jogos de futebol.
