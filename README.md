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

No celular, use **PASSE**, **BOTE**, **CARRINHO**, **TROCAR** e mantenha **CHUTE** pressionado para carregar. A tela cheia depende do suporte do navegador. Duplas continua sendo local, com teclado, controles ou toque para J1; não há partida online sincronizada.

Os efeitos 3D usam [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html), [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) e [BokehPass](https://threejs.org/docs/pages/BokehPass.html). O desfoque de movimento é uma aproximação localizada em tela, não um sistema de vetores temporais por pixel. Canvas 2D oferece apresentação alternativa da cerimônia e desgaste; normal maps, bloom e DOF reais exigem WebGL.

## Atualização Broadcast

- Câmera em perspectiva com acompanhamento preditivo da bola, transição suave e três opções: **Transmissão**, **Tática** e **Próxima**. A câmera abre para chutes rápidos e enquadra os dois humanos no modo local. O Canvas compatível usa o mesmo planejamento de enquadramento.
- Iluminação **Dia / Noite** nas configurações, arquibancadas atrás dos gols, redes que reagem ao gol, uniformes procedurais em 512², rostos e chuteiras com geometria adicional. Não há uso de modelos ou texturas extraídos de FIFA.
- Animação com apoio e recuperação das pernas, cotovelos articulados, inclinação do tronco na aceleração, inclinação nas mudanças de direção e acompanhamento da bola com a cabeça. Passe, chute e domínio têm poses e durações próprias.
- Interpolação visual entre os passos da simulação de 120 Hz. O renderizador recebe uma cópia estável das posições: não altera hitboxes nem a lógica da partida e não interpola teletransportes de reinício.
- Aceleração, frenagem e giro limitados por massa, fadiga e habilidade. Inverter a direção mantém parte do impulso anterior, exigindo desaceleração.
- **Passe direcional:** use WASD, setas ou analógico para indicar o companheiro. **Enfiada:** Shift + F no J1, Enter + K no J2 ou segure PASSE por 0,32 s no celular. O alvo é adiantado no espaço e o recebedor acompanha a trajetória, respeitando seu papel e o impedimento.
- Placar compacto de transmissão, nome do jogador no celular e indicação do alvo de passe no HUD de desktop. Câmera, iluminação, qualidade e áudio são salvos no navegador. O estádio não é recriado ao trocar times e táticas.

A referência indicada é o vídeo [FIFA 19 — Gameplay (PS4)](https://www.youtube.com/watch?v=yIuJYLBD1ik). Foi possível identificar o vídeo, mas a reprodução não disponibilizou imagens no ambiente de revisão; esta versão implementa a direção de apresentação esportiva solicitada, sem afirmar correspondência visual quadro a quadro ou superioridade ao original.

## Partida e controles

Oito atletas por lado e dois tempos de 55 segundos, totalizando **1 minuto e 50 segundos de bola em jogo**, além das interrupções. Formações `2-3-2`, `3-2-2` e `2-2-3`, com posturas equilibrada, ofensiva, defensiva e contra-ataque. Saída central, troca de lados, impedimento, lateral, escanteio, tiro de meta, faltas, pênaltis e cartões.

| Ação          | Jogador 1 | Jogador 2 |
| ------------- | --------- | --------- |
| Movimento     | WASD      | Setas     |
| Correr        | Shift     | Enter     |
| Passe         | F         | K         |
| Enfiada       | Shift + F | Enter + K |
| Chute         | Espaço    | L         |
| Bote          | E         | J         |
| Trocar atleta | Q         | I         |
| Carrinho      | R         | U         |
| Pausar        | P / Esc   | P / Esc   |

O modo duplas funciona no mesmo dispositivo, com teclado e/ou dois controles. O link público permite que cada amigo abra sua própria sessão; esta versão não sincroniza partidas entre computadores. A carreira é salva no navegador e não é compartilhada entre dispositivos.

### Controles Xbox, PlayStation e Nintendo

1. Conecte o controle ao computador ou celular por USB, ou faça o pareamento Bluetooth nas configurações do dispositivo.
2. Abra o jogo pelo link HTTPS, clique na página e pressione um botão do controle. A detecção depende de o sistema e o navegador disponibilizarem o dispositivo pela Gamepad API.
3. Abra **Configurações → Controles de videogame** para conferir J1/J2, os botões reconhecidos ou **Remapear botões**. Controles sem mapeamento padrão precisam da configuração guiada de dez passos, salva neste navegador.
4. Para duas pessoas, conecte dois controles e selecione **2 jogadores** no menu. O primeiro ocupa J1; o segundo, J2. Desconectar J1 preserva o lugar de J2 e pausa a partida.

| Ação | Xbox | PlayStation | Nintendo (layout padrão) |
| --- | --- | --- | --- |
| Mover / mirar | Analógico esquerdo | Analógico esquerdo | Analógico esquerdo |
| Passe / confirmar | A | ✕ | B |
| Chute / voltar | B | ○ | A |
| Enfiada | Y | △ | X |
| Carrinho | X | □ | Y |
| Bote | LT | L2 | ZL |
| Trocar atleta | LB | L1 | L |
| Correr | RT | R2 | ZR |
| Pausa / continuar | Menu | Options | + |

Segure e solte o botão de chute para controlar a força; sem posse, ele também tenta o bote. O analógico tem zona morta radial e força proporcional para condução lenta. Nos menus, use direcional/analógico para navegar; esquerda/direita alteram seleções focadas. Após conexão, pausa ou troca de tela, centralize o analógico e solte os botões antes de jogar. Isso impede comandos presos ou disparos ao sair de um menu.

Os nomes Nintendo seguem as posições físicas do mapeamento padrão do navegador; use **Remapear** se o adaptador apresentar outro layout. O jogo não realiza o pareamento Bluetooth e não garante suporte a todo modelo, adaptador ou Joy-Con individual. A integração consulta amostras novas a cada quadro e aceita dispositivos reconhecidos conforme a [Gamepad API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) e o [mapeamento padrão W3C](https://www.w3.org/TR/gamepad/). A validação automatizada usa amostras simuladas; controles físicos não estavam disponíveis no ambiente de desenvolvimento.

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
| `lib/football-camera.ts`        | Enquadramento compartilhado, perspectiva, zoom e preferências              |
| `lib/football-animation.ts`     | Ciclos de passada, tronco, braços e recuperação de ações                   |
| `lib/football-frame.ts`         | Interpolação visual isolada da simulação                                  |
| `lib/football-effects.ts`        | Mapas de relevo/AO, desgaste, pós-processamento e pódio 3D                 |
| `lib/football-presentation.ts`   | Pênaltis simulados, relógio da cerimônia, poses e partículas               |
| `lib/football-pitch.ts`          | Acúmulo de desgaste e marcas de carrinho                                  |
| `lib/football-input.ts`          | Analógico de toque e limpeza de comandos                                 |
| `lib/football-gamepad.ts`        | Leitura de controles, lugares J1/J2, bordas de botões e calibração         |
| `lib/football-gamepad-menu.ts`   | Navegação dos controles pelos elementos visíveis do menu                   |
| `app/controller-settings.tsx`   | Conexões reconhecidas, legendas e configuração de botões                    |
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

## Radar e desempenho adaptável

- **Radar em tempo real:** mostra todos os atletas e a bola independentemente do enquadramento da câmera; J1 usa verde e J2/adversário usa azul. Pode ser desligado nas configurações e se reposiciona nas telas pequenas.
- **Bola no ar:** sombra de contato e indicação discreta no gramado ajudam a enxergar sua posição em cruzamentos e finalizações.
- **Ajuste automático:** reduz gradualmente a resolução e os efeitos quando a renderização permanece lenta e recupera a qualidade quando há folga. A simulação, os atributos e os comandos mantêm suas regras. A opção pode ser desativada para fixar a qualidade escolhida.
- O celular inicia em qualidade equilibrada quando ainda não há preferência salva. O renderizador deixa de medir o layout a cada quadro e evita recalcular a rede quando não há gol.
- As configurações recebem os comandos de teclado sem movimentar os atletas por trás da janela.

Validação desta revisão: testes determinísticos do motor, câmeras, controles simulados e ajuste de desempenho, além da compilação de produção. A verificação com gamepads físicos continua necessária no dispositivo do jogador.
