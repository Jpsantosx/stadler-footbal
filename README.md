# Stadler Football — Matchday

Simulador independente de futebol 8×8 para navegador, em React, TypeScript e Three.js. A atualização Matchday substitui a apresentação principal em Canvas 2D por um estádio 3D e separa o motor da interface e da gestão.

- [Jogar na Vercel](https://stadler-footbal.vercel.app)
- [Código no GitHub](https://github.com/Jpsantosx/stadler-footbal)

## A atualização

- **Estádio 3D:** gramado procedural de 2048×2048, faixas de corte, desgaste, sombras, iluminação dinâmica, arquibancadas, torcida, traves e redes. Jogadores articulados com ciclos contínuos de corrida, chute, domínio, carrinho e mergulho. Canvas 2D permanece como alternativa se WebGL não estiver disponível.
- **Física:** integração fixa em 120 passos por segundo, aceleração e desaceleração, colisões ponderadas pela massa, efeito da bola, quique, atrito e domínio com possibilidade de toque pesado. Não há atração magnética da bola.
- **IA:** cobertura por zona, marcação distribuída, leitura de linhas de passe, interceptação antecipada, apoios, ultrapassagens e condução em direção ao gol. Os atacantes preservam sua faixa de atuação; a postura muda a altura e a largura das linhas.
- **Atributos:** OVR, função e perfil individual afetam velocidade, aceleração, precisão, domínio, desarme, resistência, força e tempo de decisão. Fadiga e moral da carreira alteram o rendimento.
- **Competições:** 116 clubes em seis ligas completas, calendário de ida e volta e adversários restritos à liga selecionada. Brasileirão, Premier League, LaLiga e Serie A têm 20 clubes; Bundesliga e Ligue 1 têm 18. Copas continentais e mundial usam um formato simplificado.
- **Carreira:** proposta de passe, salário semanal, duração de contrato, contraproposta, renovação, compra, venda e escalação. Clubes da IA negociam entre si e usam seus elencos atualizados. Fadiga, moral por participação, treinamento, evolução, envelhecimento e expiração de contratos são processados por rodada ou temporada.
- **Base e diretoria:** talentos fictícios podem ser promovidos. Metas de pontos, folha salarial e promoção de jovens influenciam a confiança da diretoria; resultados ruins podem causar demissão.
- **Interface:** menu Matchday, escudos PNG locais sem recortes decorativos, tabela com cabeçalho fixo, central de gestão e HUD discreto. Os atalhos de teclado ficam no menu de pausa.

## Atualização de defesa, título e celulares

- Botes usam alcance físico da bola, animação de preparação e recuperação. O contato limpo transfere posse; atingir o portador por trás gera falta. Bots próximos não dependem mais de uma distância impossível após a colisão dos corpos.
- Um segundo marcador fecha a saída quando o humano retém a posse, fica parado ou circula sem progredir. A pressão respeita funções e reinicia quando há passe ou troca de posse.
- Goleiros antecipam o ângulo do atacante, reconhecem o chute com atraso por habilidade e escolhem mergulho, defesa alta ou abafada. Permanecem sujeitos à velocidade e ao alcance físico.
- Finais da Copa disparam uma cerimônia de 17 segundos: reunião no pódio, capitão levantando a taça, confetes nas cores do campeão, flashes e fogos. Relógio, jogadores e placar ficam congelados. É possível pular ou rever; a prévia no menu da Copa não registra resultados.
- Empates na Copa usam cobranças simuladas com precisão dos cobradores, fadiga e OVR do goleiro. O resultado dos pênaltis aparece separado do placar; posse de bola não desempata.
- Gramado com diffuse 2048², mapas procedurais de normais e oclusão, máscara acumulada de tráfego e marcas de carrinho. Dois refletores projetam sombras dos membros articulados. Bloom nas luzes/taça, desfoque de movimento localizado no modo Ultra e profundidade de campo somente na cerimônia.
- Celulares: menus roláveis, tabelas com rolagem interna, áreas seguras para recortes da tela e botões de ao menos 44 px. Na vertical, o campo ocupa uma área separada dos controles; na horizontal, o HUD é compacto. Analógico com zona morta, corrida na borda e chute ao soltar; cancelamento de toque não dispara chute. Pausa, rotação e perda de foco limpam os comandos.

No celular, use **PASSE**, **BOTE**, **CARRINHO**, **TROCAR** e mantenha **CHUTE** pressionado para carregar. A tela cheia depende do suporte do navegador. Duplas continua sendo local: toque para J1 e teclado para J2; não há partida online sincronizada.

Os efeitos 3D usam [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html), [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) e [BokehPass](https://threejs.org/docs/pages/BokehPass.html). O desfoque de movimento é uma aproximação localizada em tela, não um sistema de vetores temporais por pixel. Canvas 2D oferece apresentação alternativa da cerimônia e desgaste; normal maps, bloom e DOF reais exigem WebGL.

## Partida e controles

Oito atletas por lado e dois tempos de 55 segundos, totalizando **1 minuto e 50 segundos de bola em jogo**, além das interrupções. Formações `2-3-2`, `3-2-2` e `2-2-3`, com posturas equilibrada, ofensiva, defensiva e contra-ataque. Saída central, troca de lados, impedimento, lateral, escanteio, tiro de meta, faltas, pênaltis e cartões.

| Ação          | Jogador 1 | Jogador 2 |
| ------------- | --------- | --------- |
| Movimento     | WASD      | Setas     |
| Correr        | Shift     | Enter     |
| Passe         | F         | K         |
| Chute         | Espaço    | L         |
| Bote          | E         | J         |
| Trocar atleta | Q         | I         |
| Carrinho      | R         | U         |
| Pausar        | P / Esc   | P / Esc   |

O modo duplas funciona no mesmo teclado. O link público permite que cada amigo abra sua própria sessão; esta versão não sincroniza partidas entre computadores. A carreira é salva no navegador e não é compartilhada entre dispositivos.

## Executar e verificar

Requisito: Node.js 22.13 ou superior; a Vercel usa Node.js 24.

```bash
npm ci
npm run dev:vercel
```

```bash
npm run test:game
npm run lint
npm run build:vercel
npm run start:vercel
```

`build:vercel` prepara os escudos locais e executa os testes do motor antes de compilar. As imagens são baixadas uma vez no build e verificadas por SHA-256; fontes, checksums e script ficam no GitHub. Os comandos `dev`, `build` e `start` originais continuam disponíveis para Vinext/ChatGPT Sites. Veja [DEPLOY.md](./DEPLOY.md).

## Organização do código

| Módulo                           | Responsabilidade                                                           |
| -------------------------------- | -------------------------------------------------------------------------- |
| `data/football-catalog.json`     | Clubes, atletas, função, idade, massa, OVR e origem dos dados              |
| `lib/football-engine.ts`         | Partida, atributos, tática, decisões, movimento, bola, colisões e regras   |
| `lib/football-webgl.ts`          | Estádio, materiais, texturas, luzes, câmera e animação articulada          |
| `lib/football-effects.ts`        | Mapas de relevo/AO, desgaste, pós-processamento e pódio 3D                 |
| `lib/football-presentation.ts`   | Pênaltis simulados, relógio da cerimônia, poses e partículas               |
| `lib/football-pitch.ts`          | Acúmulo de desgaste e marcas de carrinho                                  |
| `lib/football-input.ts`          | Analógico de toque e limpeza de comandos                                 |
| `lib/football-renderer.ts`       | Alternativa em Canvas 2D                                                   |
| `lib/football-competition.ts`    | Calendário, classificação, confrontos e resultados simulados               |
| `lib/football-career.ts`         | Economia, contratos, transferências, escalação, evolução, base e diretoria |
| `app/career-office.tsx`          | Telas de elenco, negociação, base e objetivos                              |
| `app/football-game.tsx`          | Menu, teclado/toque, HUD, ciclo da partida e persistência                  |
| `tests/football-engine.test.mjs` | Testes de comportamento da simulação, calendário e transações              |

O renderizador apenas lê o estado da partida. Transferências produzem uma nova versão da carreira: uma proposta rejeitada não altera caixa nem plantéis. A escalação é montada por função, preservando os contratados selecionados pelo usuário. O mesmo motor de atributos é usado por humanos e bots.

## Dados e limites da representação

O catálogo contém 3.757 atletas reais obtidos em um recorte dos dados públicos da ESPN em setembro de 2026; até 28 por clube formam o plantel profissional utilizável, selecionado por posição. O catálogo não acompanha transferências automaticamente. OVR, potencial, valores, salários e contratos são estimativas próprias, não avaliações oficiais da EA ou informações financeiras reais.

Os uniformes usam cores e padrões característicos com texturas procedurais; não são digitalizações licenciadas das camisas atuais. As animações são procedurais, sem captura de movimento. Este é um projeto de navegador em evolução, com futebol adaptado a 8×8, e não uma reprodução da complexidade ou fidelidade de EA FC. Fontes e créditos em [CREDITS.md](./CREDITS.md).

### Recalibrar o OVR

As 172 avaliações individuais revisadas ficam em `data/player-ratings.json`. Os demais atletas usam faixas conservadoras por clube e idade; reservas e jovens não recebem automaticamente notas de estrela. Depois de editar as avaliações, execute `node scripts/rebalance-ratings.mjs` e `npm run test:game`. Valores de mercado e salários usam curvas próprias que distinguem jogadores comuns de atletas de elite. Essas estimativas não são avaliações oficiais nem valores financeiros reais.
