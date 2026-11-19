# Respeito em Ação — Palavras que Aproximam

Site de uma página, em português do Brasil, para conscientização e acolhimento sobre violência, preconceito, discurso de ódio, cyberbullying e exclusão. Tem conceitos, perguntas de reflexão, situações interativas ("O que você faria?"), atitudes práticas, canais de ajuda e um **mural de apoio** em que qualquer pessoa publica sem login e todo mundo vê na hora.

## Requisitos

- **Node.js 22.13 ou superior** (usa o SQLite embutido do Node, `node:sqlite`).
- Nenhuma dependência para instalar: não há `npm install`.

## Como rodar

```bash
cd respeito-em-acao
npm start
# abra http://localhost:3000
```

Para desenvolvimento com reinício automático: `npm run dev`. Para testar a API: `npm test`.

O Node mostra um aviso `ExperimentalWarning: SQLite is an experimental feature`. É esperado e inofensivo.

## Variáveis de ambiente (todas opcionais)

| Variável      | Padrão      | Para que serve |
|---------------|-------------|----------------|
| `PORT`        | `3000`      | Porta do servidor. |
| `HOST`        | `0.0.0.0`   | Endereço de escuta. |
| `DATA_DIR`    | `./data`    | Pasta do banco `mural.db`. **Mantenha-a em disco persistente.** |
| `SITE_URL`    | (automático)| Endereço público, ex.: `https://meusite.com.br`. Usado nas metatags `og:image` e `og:url`. |
| `TRUST_PROXY` | —           | Use `1` atrás de nginx/Render/Railway etc., para ler o IP real (limite de frequência) e o protocolo. |
| `ADMIN_TOKEN` | —           | Habilita a moderação: `DELETE /api/messages/:id` com `Authorization: Bearer <token>`. |

Exemplo de moderação (remover uma mensagem):

```bash
curl -X DELETE -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/messages/12
```

## Como funciona o mural

- As mensagens ficam em um banco **SQLite** (`data/mural.db`), portanto continuam lá no dia seguinte, e ao reiniciar o servidor. São listadas da mais recente para a mais antiga, 20 por vez ("Ver mensagens mais antigas"), e a página se atualiza sozinha a cada 25 s.
- **Abraço (🤗):** cada visitante recebe um identificador anônimo aleatório (no `localStorage`). O servidor guarda um par `(mensagem, visitante)` único, então o mesmo visitante não abraça a mesma mensagem duas vezes, mesmo que a página seja recarregada. O navegador também lembra e desabilita o botão.
- **Antispam:** texto de 3 a 600 caracteres e nome de até 40; 1 mensagem a cada 20 s e no máximo 8 por hora por IP; mensagem idêntica bloqueada por 10 min; links recusados; campo-armadilha (honeypot) para robôs; corpo de requisição limitado a 4 KB.
- **Segurança:** o texto é sempre inserido com `textContent` (sem HTML), cabeçalhos de segurança e Content-Security-Policy restritiva (nenhum script ou estilo inline).

## API

| Método e rota | Descrição |
|---|---|
| `GET /api/messages?limit=20&before=<id>` | Lista mensagens (mais recentes primeiro). |
| `POST /api/messages` | `{ type: "apoio"\|"relato"\|"compromisso", name?, text }` |
| `POST /api/messages/:id/hug` | Abraça (cabeçalho `X-Visitor`). Idempotente por visitante. |
| `DELETE /api/messages/:id` | Moderação (exige `ADMIN_TOKEN`). |

## Estrutura

```
respeito-em-acao/
├── server.js          # servidor HTTP + API + SQLite (sem dependências)
├── package.json
├── data/              # banco mural.db (criado automaticamente)
├── test/smoke.js      # teste da API
└── public/
    ├── index.html     # a página
    ├── styles.css
    ├── app.js         # situações interativas + mural
    ├── fonts/         # Fraunces e Nunito Sans (auto-hospedadas)
    └── img/           # ilustrações SVG, favicon e og-image.png
```

## Publicando (opcional)

Qualquer hospedagem que rode Node 22+ com **disco persistente** serve. Aponte `DATA_DIR` para o disco persistente, defina `SITE_URL` e, atrás de proxy, `TRUST_PROXY=1`. Em hospedagens com disco efêmero (como funções serverless), o mural perderia as mensagens: use um volume ou troque o armazenamento por um banco gerenciado.

## Canais de ajuda citados

Disque 100 (Direitos Humanos), 180 (Central de Atendimento à Mulher), 188 (CVV, apoio emocional 24 h). Em emergência: 190 (Polícia) e 192 (SAMU).
