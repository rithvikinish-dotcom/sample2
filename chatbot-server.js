const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3001;

function readEnvFile() {
  const envPath = path.join(__dirname, ".env");
  const vars = {};

  if (!fs.existsSync(envPath)) return vars;

  const raw = fs.readFileSync(envPath, "utf8").replace(/\uFEFF/g, "");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim().replace(/^\uFEFF/, "");
    const value = trimmed.slice(idx + 1).trim();
    vars[key] = value;
  }

  return vars;
}

function resolveApiKey() {
  const env = readEnvFile();
  const envFileRaw = fs.existsSync(path.join(__dirname, ".env"))
    ? fs.readFileSync(path.join(__dirname, ".env"), "utf8").replace(/\uFEFF/g, "")
    : "";

  const regexGemini = envFileRaw.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/m);
  const regexApi = envFileRaw.match(/^\s*API_KEY\s*=\s*(.+)\s*$/m);

  return (
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    env.GEMINI_API_KEY ||
    env.API_KEY ||
    (regexGemini ? regexGemini[1].trim() : "") ||
    (regexApi ? regexApi[1].trim() : "") ||
    ""
  );
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
    res.end();
    return;
  }

  if (req.url !== "/chat" || req.method !== "POST") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const API_KEY = resolveApiKey();

  if (!API_KEY) {
    sendJson(res, 500, { error: "Missing API_KEY in .env" });
    return;
  }

  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", async () => {
    try {
      const body = JSON.parse(rawBody || "{}");
      const message = (body.message || "").trim();

      if (!message) {
        sendJson(res, 400, { error: "Message is required" });
        return;
      }

      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(API_KEY)}`;

      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ]
        })
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        sendJson(res, 500, {
          error: data?.error?.message || "Gemini request failed"
        });
        return;
      }

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response returned by Gemini.";

      sendJson(res, 200, { reply });
    } catch (err) {
      sendJson(res, 500, { error: "Server error while processing request" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatbot server running at http://localhost:${PORT}`);
});
