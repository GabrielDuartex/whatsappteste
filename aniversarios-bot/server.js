// ============================================================
//  Bot de Aniversários no WhatsApp (versão simples / CallMeBot)
//  - Guarda nome + data de aniversário
//  - Todo dia às 09:00 (Brasília) checa quem faz aniversário
//    e te manda mensagem no WhatsApp via CallMeBot (HTTP simples)
//  - Sem Chromium, sem QR code: deploy fácil no Railway/GitHub
// ============================================================

const express = require("express");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

// ---------- Configuração (variáveis de ambiente) ----------
const PORT = process.env.PORT || 3000;
// Seu telefone no formato internacional. Ex Brasil: +5551999998888
const CALLMEBOT_PHONE = process.env.CALLMEBOT_PHONE || "";
// Apikey que o CallMeBot te manda no WhatsApp na ativação
const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY || "";
const HORARIO_CRON = process.env.HORARIO_CRON || "0 9 * * *"; // todo dia 09:00
const TZ = "America/Sao_Paulo";
// Pasta dos dados. No Railway, monte um volume e aponte DATA_DIR pra ele.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "birthdays.json");

// ---------- "Banco" simples em JSON ----------
function lerAniversarios() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}
function salvarAniversarios(lista) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(lista, null, 2));
}

// ---------- Envio via CallMeBot ----------
async function enviarParaMim(texto) {
  if (!CALLMEBOT_PHONE || !CALLMEBOT_APIKEY) {
    throw new Error("Configure CALLMEBOT_PHONE e CALLMEBOT_APIKEY.");
  }
  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(CALLMEBOT_PHONE)}` +
    `&text=${encodeURIComponent(texto)}` +
    `&apikey=${encodeURIComponent(CALLMEBOT_APIKEY)}`;

  const resp = await fetch(url);
  const corpo = await resp.text();
  if (!resp.ok) {
    throw new Error(`CallMeBot respondeu ${resp.status}: ${corpo.slice(0, 200)}`);
  }
  return corpo;
}

// ---------- Lógica dos aniversários ----------
function hojeEmBrasilia() {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  return {
    dia: parseInt(p.day, 10),
    mes: parseInt(p.month, 10),
    ano: parseInt(p.year, 10),
  };
}

async function checarAniversarios() {
  const hoje = hojeEmBrasilia();
  const lista = lerAniversarios();
  const aniversariantes = lista.filter(
    (p) => p.dia === hoje.dia && p.mes === hoje.mes
  );

  if (aniversariantes.length === 0) {
    console.log(`(${hoje.dia}/${hoje.mes}) Ninguém faz aniversário hoje.`);
    return { enviados: 0 };
  }

  for (const p of aniversariantes) {
    let texto = `🎉 *Aniversário hoje!*\n\nHoje é aniversário de *${p.nome}* 🎂`;
    if (p.ano) texto += `\nEstá completando *${hoje.ano - p.ano} anos*.`;
    texto += `\n\nNão esquece de mandar um parabéns! 🥳`;

    try {
      await enviarParaMim(texto);
      console.log(`✅ Aviso enviado: ${p.nome}`);
    } catch (e) {
      console.error(`❌ Erro ao avisar sobre ${p.nome}:`, e.message);
    }
  }
  return { enviados: aniversariantes.length };
}

cron.schedule(HORARIO_CRON, checarAniversarios, { timezone: TZ });
console.log(`⏰ Checagem agendada: "${HORARIO_CRON}" (${TZ}).`);

// ---------- Servidor web / API ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({ configurado: !!(CALLMEBOT_PHONE && CALLMEBOT_APIKEY) });
});

app.get("/api/birthdays", (req, res) => {
  const hoje = hojeEmBrasilia();
  const lista = lerAniversarios().map((p) => ({
    ...p,
    diasAte: diasAteProximo(p, hoje),
  }));
  lista.sort((a, b) => a.diasAte - b.diasAte);
  res.json(lista);
});

app.post("/api/birthdays", (req, res) => {
  const { nome, dia, mes, ano } = req.body;
  if (!nome || !dia || !mes) {
    return res.status(400).json({ erro: "Preencha nome, dia e mês." });
  }
  const lista = lerAniversarios();
  const novo = {
    id: Date.now().toString(),
    nome: String(nome).trim(),
    dia: parseInt(dia, 10),
    mes: parseInt(mes, 10),
    ano: ano ? parseInt(ano, 10) : null,
  };
  lista.push(novo);
  salvarAniversarios(lista);
  res.json(novo);
});

app.delete("/api/birthdays/:id", (req, res) => {
  const lista = lerAniversarios().filter((p) => p.id !== req.params.id);
  salvarAniversarios(lista);
  res.json({ ok: true });
});

app.post("/api/test", async (req, res) => {
  try {
    await enviarParaMim("🤖 Teste! Seu bot de aniversários está funcionando. ✅");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post("/api/check-now", async (req, res) => {
  try {
    const r = await checarAniversarios();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

function diasAteProximo(p, hoje) {
  const agora = new Date(hoje.ano, hoje.mes - 1, hoje.dia);
  let prox = new Date(hoje.ano, p.mes - 1, p.dia);
  if (prox < agora) prox = new Date(hoje.ano + 1, p.mes - 1, p.dia);
  return Math.round((prox - agora) / (1000 * 60 * 60 * 24));
}

app.listen(PORT, () => {
  console.log(`🌐 Painel rodando em http://localhost:${PORT}`);
});
