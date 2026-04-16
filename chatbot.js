(() => {
  const style = document.createElement("style");
  style.textContent = `
    #gemini-chat-fab {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 58px;
      height: 58px;
      border: none;
      border-radius: 50%;
      background: #6265f5;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(73, 74, 219, 0.35);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    #gemini-chat-fab:hover { transform: scale(1.06); }
    #gemini-chat-panel {
      position: fixed;
      right: 24px;
      bottom: 92px;
      width: 360px;
      max-width: calc(100vw - 24px);
      height: 520px;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
      z-index: 9999;
      display: none;
      overflow: hidden;
      font-family: Inter, sans-serif;
    }
    #gemini-chat-panel.open { display: flex; flex-direction: column; }
    #gemini-chat-header {
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    #gemini-chat-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    #gemini-chat-close {
      border: none;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #gemini-chat-body {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .gemini-row { display: flex; }
    .gemini-row.user { justify-content: flex-end; }
    .gemini-bubble {
      max-width: 85%;
      padding: 9px 11px;
      border-radius: 12px;
      line-height: 1.35;
      white-space: pre-wrap;
      font-size: 13px;
    }
    .gemini-row.bot .gemini-bubble {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
    }
    .gemini-row.user .gemini-bubble {
      background: #494adb;
      color: #ffffff;
    }
    #gemini-chat-footer {
      border-top: 1px solid #e2e8f0;
      padding: 10px;
      display: flex;
      gap: 8px;
      background: #ffffff;
    }
    #gemini-chat-input {
      flex: 1;
      padding: 9px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    #gemini-chat-send {
      border: none;
      background: #6265f5;
      color: #ffffff;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const fab = document.createElement("button");
  fab.id = "gemini-chat-fab";
  fab.setAttribute("aria-label", "Open chatbot");
  fab.innerHTML = '<span class="material-symbols-outlined">chat</span>';

  const panel = document.createElement("section");
  panel.id = "gemini-chat-panel";
  panel.innerHTML = `
    <div id="gemini-chat-header">
      <h3 id="gemini-chat-title">AI Chat (Gemini)</h3>
      <button id="gemini-chat-close" aria-label="Close chat">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div id="gemini-chat-body"></div>
    <div id="gemini-chat-footer">
      <input id="gemini-chat-input" type="text" placeholder="Ask anything..." />
      <button id="gemini-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const body = panel.querySelector("#gemini-chat-body");
  const closeBtn = panel.querySelector("#gemini-chat-close");
  const sendBtn = panel.querySelector("#gemini-chat-send");
  const input = panel.querySelector("#gemini-chat-input");

  const addMessage = (text, role = "bot") => {
    const row = document.createElement("div");
    row.className = `gemini-row ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "gemini-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  };

  addMessage("Hi! Ask me anything.");

  const callGemini = async (message) => {
    const response = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || "Gemini request failed");
    }

    const data = await response.json();
    return data?.reply || "No response returned by Gemini.";
  };

  const onSend = async () => {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMessage(text, "user");
    addMessage("Thinking...", "bot");
    const typingBubble = body.lastElementChild;

    try {
      const reply = await callGemini(text);
      typingBubble.querySelector(".gemini-bubble").textContent = reply;
    } catch (err) {
      typingBubble.querySelector(".gemini-bubble").textContent =
        "Error connecting to chatbot server. Start server and try again.";
      console.error(err);
    }
  };

  fab.addEventListener("click", () => panel.classList.toggle("open"));
  closeBtn.addEventListener("click", () => panel.classList.remove("open"));
  sendBtn.addEventListener("click", onSend);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });
})();
