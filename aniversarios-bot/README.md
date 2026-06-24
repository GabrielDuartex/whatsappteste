# 🎂 Bot de Aniversários no WhatsApp (versão simples)

Avisa **você** no WhatsApp todo dia que chegar o aniversário de alguém.
Usa o **CallMeBot** pra enviar — então **não precisa de Chromium, QR code nem
sessão**. Deploy no Railway via GitHub é direto: só `npm` + variáveis de ambiente.

---

## Passo 1 — Ativar o CallMeBot (1 vez, 2 minutos)

1. No site **callmebot.com** (seção WhatsApp) pegue o **número atual do bot** —
   ele muda de vez em quando, então confira lá.
2. Adicione esse número nos seus **contatos** do celular.
3. Pelo **seu WhatsApp**, mande pra esse contato a mensagem:
   ```
   I allow callmebot to send me messages
   ```
4. O bot responde com a sua **APIKEY** (algo como `API Activated... Your APIKEY is 123456`).
   Guarde esse número.

> Se não chegar em ~2 minutos, tente de novo depois (o serviço às vezes fica cheio).

---

## Passo 2 — Rodar local (testar antes de subir)

```bash
npm install

# Linux / Mac
CALLMEBOT_PHONE="+5551999998888" CALLMEBOT_APIKEY="123456" npm start

# Windows (PowerShell)
$env:CALLMEBOT_PHONE="+5551999998888"; $env:CALLMEBOT_APIKEY="123456"; npm start
```

Abra **http://localhost:3000**, clique em **"Enviar teste pra mim"** e veja a
mensagem chegar no seu WhatsApp. Cadastre as pessoas e pronto.

---

## Passo 3 — Subir no GitHub + Railway

1. Suba a pasta pro **GitHub** (o `.gitignore` já ignora `node_modules` e `.env`).
2. No **Railway**: *New Project → Deploy from GitHub repo* → escolha o repositório.
   O Railway detecta Node e roda `npm install` + `npm start` sozinho.
3. Em **Variables**, adicione:
   | Variável            | Valor                         |
   |---------------------|-------------------------------|
   | `CALLMEBOT_PHONE`   | `+5551999998888` (o seu)      |
   | `CALLMEBOT_APIKEY`  | a apikey do passo 1           |
   | `DATA_DIR`          | `/data`                       |
   | `HORARIO_CRON`      | `0 9 * * *` (opcional)        |
4. **Volume** (pra não perder os aniversários a cada deploy):
   *Settings → Volumes → New Volume*, monte em **`/data`**
   (o mesmo caminho que você pôs em `DATA_DIR`).

Pronto. O painel fica acessível na URL pública do Railway, e às 9h (Brasília)
o bot checa e te avisa.

---

## Variáveis de ambiente

| Variável            | Padrão        | O que é                                         |
|---------------------|---------------|-------------------------------------------------|
| `CALLMEBOT_PHONE`   | —             | Seu telefone (formato internacional). **Defina!**|
| `CALLMEBOT_APIKEY`  | —             | Apikey do CallMeBot. **Defina!**                |
| `DATA_DIR`          | `./data`      | Pasta dos dados (no Railway: o caminho do volume)|
| `PORT`              | `3000`        | Porta do painel                                 |
| `HORARIO_CRON`      | `0 9 * * *`   | Quando checar (formato cron, fuso de Brasília)  |

## Observações

- CallMeBot é **gratuito e só pra uso pessoal** — manda mensagem **só pra você**.
  Pro caso de "me avisar dos aniversários" é exatamente o que precisa.
- Sem volume no Railway, a lista de aniversários se perde a cada redeploy.
  Por isso o `DATA_DIR` + volume no Passo 3.
