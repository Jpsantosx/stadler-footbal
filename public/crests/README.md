# Escudos locais

`npm run assets` baixa os 116 PNGs originais listados em `data/football-catalog.json`.
Os arquivos são verificados pelos hashes SHA-256 em `data/crest-checksums.json` e servidos localmente no jogo.

O build da Vercel executa essa preparação automaticamente. As imagens binárias geradas não são versionadas; as fontes, os checksums e o script permitem reproduzir exatamente os arquivos revisados.
