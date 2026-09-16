# Publicação

A versão principal é [stadler-footbal.vercel.app](https://stadler-footbal.vercel.app), no projeto Vercel `stadler-footbal`.

## Vercel e GitHub

1. Importe `Jpsantosx/stadler-footbal` na sua conta Vercel.
2. Use o preset Next.js e Node.js 24. O arquivo `vercel.json` já define `npm run build:vercel`.
3. Não são necessárias chaves de API para jogar; o catálogo acompanha o projeto e o build baixa os escudos originais com verificação de checksum.
4. Publique uma prévia, confira o menu, uma partida e a central da carreira.
5. Promova a prévia validada para produção.

Pela CLI autenticada:

```bash
npm ci
npm run lint
npm run build:vercel
vercel link
vercel
vercel promote URL_DA_PREVIA
```

A integração GitHub pode gerar prévias para branches e publicar `main` automaticamente. Não coloque tokens no repositório.

## Servidor Node.js

```bash
npm ci
npm run build:vercel
npm run start:vercel
```

O servidor atende na porta 3000 por padrão. Configure HTTPS no provedor.

## Compartilhamento e saves

O link pode ser aberto em computadores diferentes. Duplas usa o mesmo teclado; partidas online sincronizadas precisam de servidor de salas e netcode, ainda não implementados. O save da carreira usa `localStorage`, separado por navegador e domínio; uma carreira iniciada numa prévia não aparece automaticamente no domínio de produção.

O build Vinext legado permanece disponível para ChatGPT Sites, mas a atualização Matchday tem a Vercel como destino principal.
