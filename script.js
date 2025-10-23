// =========================
// CONFIGURATION
// =========================
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
let API_KEY = "";
let currentDomain = null;
let conversationHistory = [];

// =========================
// PAGE ELEMENTS
// =========================
const welcomeScreen = document.getElementById("welcomeScreen");
const chatScreen = document.getElementById("chatScreen");
const imageScreen = document.getElementById("imageScreen");
const apiModal = document.getElementById("apiModal");
const messagesContainer = document.getElementById("messagesContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");
const newChatBtn = document.getElementById("newChatBtn");
const currentDomainEl = document.getElementById("currentDomain");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiBtn = document.getElementById("saveApiBtn");
const uploadDocBtn = document.getElementById("uploadDocBtn");
const fileInput = document.getElementById("fileInput");
const generateImageBtn = document.getElementById("generateImageBtn");
const backFromImageBtn = document.getElementById("backFromImageBtn");
const imagePrompt = document.getElementById("imagePrompt");
const generateBtn = document.getElementById("generateBtn");
const imageLoading = document.getElementById("imageLoading");
const generatedImage = document.getElementById("generatedImage");
const suggestBtn = document.getElementById("suggestBtn");

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const savedKey = localStorage.getItem("groq_api_key");
  if (savedKey) API_KEY = savedKey;
  else apiModal.classList.add("active");
  setupEventListeners();
});

function setupEventListeners() {
  document.querySelectorAll(".domain-card").forEach((card) => {
    card.addEventListener("click", () => startDomainChat(card.dataset.domain));
  });

  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  backBtn.addEventListener("click", () => showScreen("welcome"));
  newChatBtn.addEventListener("click", () => startNewChat());
  saveApiBtn.addEventListener("click", saveApiKey);

  uploadDocBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);
  generateImageBtn.addEventListener("click", () => showScreen("image"));
  backFromImageBtn.addEventListener("click", () => showScreen("chat"));
  generateBtn.addEventListener("click", generateImage);
  suggestBtn.addEventListener("click", showSuggestions);
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) return alert("Please enter your Groq API Key.");
  API_KEY = key;
  localStorage.setItem("groq_api_key", key);
  apiModal.classList.remove("active");
  alert("Groq API Key saved successfully!");
}

// =========================
// CHAT FLOW
// =========================
function startDomainChat(domain) {
  currentDomain = domain;
  const domainInfo = DOMAINS[domain];
  currentDomainEl.textContent = `${domainInfo.icon} ${domainInfo.name}`;
  showScreen("chat");
  conversationHistory = [];
  messagesContainer.innerHTML = "";
  addMessage("ai", `Hi! I'm your ${domainInfo.name} assistant. ${getWelcomeText(domain)}`);
}

function startNewChat() {
  conversationHistory = [];
  messagesContainer.innerHTML = "";
  addMessage("ai", `Hi! I'm ready to help you with ${DOMAINS[currentDomain].name}. What do you need?`);
}

function getWelcomeText(domain) {
  const text = {
    study: "What are you studying? Just tell me the subject!",
    content: "What type of content do you want to create today?",
    business: "Tell me your business idea or goal!",
    coding: "What project or code issue are you working on?",
    creative: "Describe your creative idea — story, design, or art!",
    health: "What’s your health or fitness goal?",
    career: "Looking for career or resume help?",
    finance: "Want tips about budgeting or saving?",
    research: "Tell me your research topic.",
    personal: "What goal or challenge are you focusing on?",
    travel: "Which place or trip do you want to plan?",
    general: "What would you like to discuss today?"
  };
  return text[domain] || "Let's get started!";
}

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || !API_KEY) return;

  addMessage("user", message);
  userInput.value = "";

  const typingId = addTypingIndicator();
  try {
    const domainInfo = DOMAINS[currentDomain];
    const prompt = buildPrompt(message, domainInfo);
    const reply = await callGroqAPI(prompt);
    removeTypingIndicator(typingId);
    addMessage("ai", reply);
    conversationHistory.push({ user: message, ai: reply });
  } catch (err) {
    removeTypingIndicator(typingId);
    addMessage("ai", `Error: ${err.message}`);
  }
}

function buildPrompt(userMsg, domainInfo) {
  let context = domainInfo.systemPrompt + "\n\n";
  if (conversationHistory.length) {
    context += "Recent conversation:\n";
    conversationHistory.slice(-3).forEach(turn => {
      context += `User: ${turn.user}\nAI: ${turn.ai}\n`;
    });
  }
  if (userMsg.split(" ").length < 3) {
    context += `User message is short ("${userMsg}"). Ask clarifying questions and suggest multiple helpful options.\n\n`;
  }
  context += `User: ${userMsg}\nAssistant:`;
  return context;
}

// =========================
// GROQ API CALL
// =========================
async function callGroqAPI(prompt) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a friendly AI who helps users simply and intelligently." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: false
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Groq API Error ${response.status}: ${txt}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "No response received.";
}

// =========================
// DOCUMENT UPLOAD
// =========================
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  addMessage("user", `📄 Uploaded: ${file.name}`);
  const typingId = addTypingIndicator();

  try {
    const text = await file.text();
    const summaryPrompt = `The user uploaded a document. Summarize it clearly and ask what detailed help they'd like next:\n\n${text.slice(0, 15000)}`;
    const reply = await callGroqAPI(summaryPrompt);
    removeTypingIndicator(typingId);
    addMessage("ai", reply);
  } catch (err) {
    removeTypingIndicator(typingId);
    addMessage("ai", "Sorry, I couldn’t read that file. Try a .txt file.");
  }
  fileInput.value = "";
}

// =========================
// IMAGE GENERATION (optional placeholder)
// =========================
async function generateImage() {
  const prompt = imagePrompt.value.trim();
  if (!prompt) return alert("Please describe your image first!");
  generatedImage.style.display = "none";
  imageLoading.style.display = "block";

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt })
    });
    const blob = await response.blob();
    const src = URL.createObjectURL(blob);
    generatedImage.src = src;
    generatedImage.style.display = "block";
    imageLoading.style.display = "none";
  } catch {
    imageLoading.style.display = "none";
    alert("Image generation temporarily unavailable.");
  }
}

// =========================
// SUGGESTIONS
// =========================
function showSuggestions() {
  const s = DOMAINS[currentDomain].suggestions;
  let msg = "Here are some ideas:\n";
  s.forEach((x, i) => (msg += `${i + 1}. ${x}\n`));
  addMessage("ai", msg);
}

// =========================
// CHAT UI HELPERS
// =========================
function addMessage(type, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = type === "user" ? "👤" : "🤖";
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  msgDiv.append(avatar, content);
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addTypingIndicator() {
  const t = document.createElement("div");
  t.className = "message ai";
  t.id = "typing";
  t.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content typing-indicator">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>`;
  messagesContainer.appendChild(t);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return "typing";
}
function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  if (screen === "welcome") welcomeScreen.classList.add("active");
  if (screen === "chat") chatScreen.classList.add("active");
  if (screen === "image") imageScreen.classList.add("active");
}
