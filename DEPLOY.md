# Publicação do Stadler Football 3D

## Opção mais simples: versão já publicada

Compartilhe este endereço:

<https://stadler-football-3d.joaopedrostadl554190.chatgpt.site>

Qualquer computador com navegador moderno pode abrir o jogo pelo link. O modo “2 jogadores” atual usa o mesmo teclado/dispositivo; partidas sincronizadas entre dois computadores exigem um servidor de salas e netcode, que não faz parte desta versão.

## Publicar a partir do GitHub com Docker

O repositório inclui um `Dockerfile`, compatível com serviços que aceitam contêineres, como Render, Railway, Fly.io e uma VPS.

1. Faça fork ou clone de `https://github.com/Jpsantosx/stadler-footbal`.
2. No painel do provedor, crie um novo serviço Web a partir desse repositório.
3. Selecione implantação por `Dockerfile`.
4. Configure a porta como `3000` se o provedor não injetar a variável `PORT` automaticamente.
5. Execute o deploy e abra o domínio HTTPS fornecido.

Teste local do mesmo contêiner:

```bash
docker build -t stadler-football .
docker run --rm -p 3000:3000 stadler-football
```

Depois, acesse <http://localhost:3000>.

## Publicar sem Docker

Em um servidor com Node.js 22:

```bash
git clone https://github.com/Jpsantosx/stadler-footbal.git
cd stadler-footbal
npm ci
npm run build
PORT=3000 npm run start
```

Coloque Nginx, Caddy ou o proxy HTTPS do provedor na frente da porta 3000.

## Vercel, Netlify e GitHub Pages

Este projeto usa Vinext/Cloudflare Worker e possui execução de servidor. Por isso, GitHub Pages não é um destino direto e Vercel/Netlify exigiriam uma adaptação do runtime. Para publicar o código atual sem reescrever o motor, prefira a URL já ativa ou um dos provedores de contêiner descritos acima.

## Atualizações

Depois de alterar o código:

```bash
npm test
git add .
git commit -m "Descrição da melhoria"
git push origin main
```

Um serviço conectado ao GitHub pode fazer novo deploy automaticamente a cada `push`.
