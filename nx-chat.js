/* =============================================
   MEEKHUB — GIFT CARD CHAT ENGINE
   ============================================= */

const RATES = {
  "Apple":       570,
  "iTunes":      560,
  "Google Play": 540,
  "Amazon":      530,
  "eBay":        510,
  "Steam":       500,
  "Sephora":     490,
  "Nike":        485,
  "Nordstrom":   480,
  "Vanilla":     460,
  "Amex":        460,
};

let state = {
  step: "card",
  card: null,
  amount: 0,
  country: null,
  bank: null,
  acct: null,
  email: null,
  images: [],
};

const msgsEl    = document.getElementById("chatMsgs");
const inputEl   = document.getElementById("msgInput");
const sendBtn   = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const previewEl = document.getElementById("uploadPreview");
const newChatBtn = document.getElementById("newChatBtn");

/* ── Helpers ── */
function ts() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function scroll() { msgsEl.scrollTop = msgsEl.scrollHeight; }
function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function addBot(html, qrs = []) {
  const wrap = document.createElement("div");
  wrap.className = "msg b";
  wrap.innerHTML = `
    <div class="m-av">NX</div>
    <div class="m-body">
      <div class="bubble">${html}</div>
      <div class="m-time">${ts()}</div>
    </div>`;
  msgsEl.appendChild(wrap);
  if (qrs.length) {
    const qd = document.createElement("div");
    qd.className = "quick-replies";
    qd.innerHTML = qrs.map(q => `<button class="qr-btn" data-v="${esc(q)}">${esc(q)}</button>`).join("");
    msgsEl.appendChild(qd);
    qd.querySelectorAll(".qr-btn").forEach(b => {
      b.addEventListener("click", () => {
        qd.querySelectorAll(".qr-btn").forEach(x => x.disabled = true);
        addUser(b.dataset.v);
        setTimeout(() => process(b.dataset.v), 400);
      });
    });
  }
  scroll();
}

function addUser(text) {
  const wrap = document.createElement("div");
  wrap.className = "msg u";
  wrap.innerHTML = `
    <div class="m-av">You</div>
    <div class="m-body">
      <div class="bubble">${esc(text)}</div>
      <div class="m-time">${ts()}</div>
    </div>`;
  msgsEl.appendChild(wrap);
  scroll();
}

function showTyping() {
  const el = document.createElement("div");
  el.className = "msg b"; el.id = "typing";
  el.innerHTML = `<div class="m-av">NX</div><div class="m-body"><div class="bubble typing-bubble"><div class="dots"><span></span><span></span><span></span></div></div></div>`;
  msgsEl.appendChild(el); scroll();
}
function hideTyping() { const e = document.getElementById("typing"); if (e) e.remove(); }

function botSay(html, qrs = [], delay = 850) {
  showTyping();
  return new Promise(res => setTimeout(() => { hideTyping(); addBot(html, qrs); res(); }, delay));
}

function payout(card, amount) { return (amount * RATES[card]) - 30; }

function summaryHtml() {
  const p = payout(state.card, state.amount);
  return `
    <div class="t-summary">
      <div class="ts-title">Trade Summary</div>
      <div class="ts-row"><span>Card</span><span>${state.card}</span></div>
      <div class="ts-row"><span>Amount</span><span>$${state.amount}</span></div>
      <div class="ts-row"><span>Country</span><span>${state.country}</span></div>
      <div class="ts-row"><span>Rate</span><span>₦${RATES[state.card]}/USD</span></div>
      <div class="ts-row"><span>Bank</span><span>${state.bank}</span></div>
      <div class="ts-row"><span>Account</span><span>${state.acct}</span></div>
      <div class="ts-row"><span>You Receive</span><span>₦${p.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span></div>
    </div>`;
}

/* ── Flow ── */
function handleCardSelect(card) {
  if (!RATES[card]) {
    botSay("That card isn't supported yet. Please pick from the list.", Object.keys(RATES));
    return;
  }
  state.card = card;
  state.step = "amount";
  botSay(`<strong>${card}</strong> is trading at <span style="color:var(--green);font-weight:600">₦${RATES[card]}/USD</span> today.<br/>How much is your card worth in USD?`);
}

async function process(text) {
  const t = text.trim();
  if (!t) return;

  switch (state.step) {

    case "card": {
      const m = Object.keys(RATES).find(c => c.toLowerCase() === t.toLowerCase());
      m ? handleCardSelect(m) : botSay("Please select a card from the sidebar.", Object.keys(RATES));
      break;
    }

    case "amount": {
      const a = parseFloat(t.replace(/[^0-9.]/g, ""));
      if (!a || a < 5) { botSay("Please enter a valid amount. Minimum is $5."); return; }
      state.amount = a;
      state.step = "country";
      botSay(`Got it — <strong>$${a} ${state.card}</strong>.<br/>Which country issued the card?`,
        ["United States", "United Kingdom", "Canada", "Australia", "Other"]);
      break;
    }

    case "country":
      state.country = t;
      state.step = "bank";
      botSay("What is your bank name?",
        ["Access Bank", "GTBank", "First Bank", "Zenith Bank", "UBA", "Other"]);
      break;

    case "bank":
      state.bank = t;
      state.step = "acct";
      botSay(`Enter your <strong>10-digit account number</strong> for <strong>${t}</strong>.`);
      break;

    case "acct": {
      const clean = t.replace(/\s/g, "");
      if (!/^\d{10}$/.test(clean)) { botSay("Account number must be exactly 10 digits. Please try again."); return; }
      state.acct = clean;
      state.step = "email";
      botSay("What email address should we send the trade confirmation to?");
      break;
    }

    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) { botSay("That email address looks invalid. Please try again."); return; }
      state.email = t;
      state.step = "confirm";
      botSay(
        `Here is your trade summary:${summaryHtml()}<br/>You can also attach an image of your card using the 📎 button.<br/><br/>Ready to submit?`,
        ["✔ Confirm & Submit", "✖ Start Over"]
      );
      break;

    case "confirm":
      if (t.includes("Confirm")) {
        state.step = "done";
        const id = "NX-" + Math.random().toString(36).substr(2, 8).toUpperCase();
        botSay(
          `<strong>Trade submitted!</strong><br/><br/>
          Order ID: <span style="color:var(--gold);font-family:var(--font-mono)">${id}</span><br/>
          Payout to your account within <strong>5–10 minutes</strong>.<br/>
          Confirmation sent to <strong>${state.email}</strong>.<br/><br/>
          Questions? WhatsApp: <a href="https://wa.me/2349075870779" style="color:var(--gold)">08080437118</a>`,
          ["Trade Again"]
        );
      } else {
        resetState();
        botSay("No problem. Let's start over. Which card would you like to sell?", Object.keys(RATES));
        state.step = "card";
      }
      break;

    case "done":
      resetState();
      botSay("Which card would you like to sell?", Object.keys(RATES));
      state.step = "card";
      break;

    default:
      botSay("Let's start fresh. Which card would you like to sell?", Object.keys(RATES));
      state.step = "card";
  }
}

function resetState() {
  state = { step: "card", card: null, amount: 0, country: null, bank: null, acct: null, email: null, images: [] };
  previewEl.innerHTML = "";
}

/* ── Events ── */
function doSend() {
  const v = inputEl.value.trim();
  if (!v) return;
  inputEl.value = "";
  addUser(v);
  setTimeout(() => process(v), 350);
}

sendBtn.addEventListener("click", doSend);
inputEl.addEventListener("keydown", e => { if (e.key === "Enter") doSend(); });

fileInput.addEventListener("change", () => {
  Array.from(fileInput.files).forEach(file => {
    const r = new FileReader();
    r.onload = e => {
      const t = document.createElement("div");
      t.className = "thumb";
      t.innerHTML = `<img src="${e.target.result}" alt="card"/><button title="Remove">✕</button>`;
      t.querySelector("button").addEventListener("click", () => t.remove());
      previewEl.appendChild(t);
      state.images.push(e.target.result);
    };
    r.readAsDataURL(file);
  });
  fileInput.value = "";
});

newChatBtn.addEventListener("click", () => {
  msgsEl.innerHTML = "";
  resetState();
  botSay("Welcome back! Which gift card would you like to sell?", Object.keys(RATES), 400);
  state.step = "card";
});

/* ── Boot ── */
botSay(
  "Welcome to <strong>MeekHub</strong>. Which gift card would you like to sell today?",
  Object.keys(RATES),
  600
);
