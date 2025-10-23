// Initial tab logic
document.querySelectorAll(".tab-link").forEach(el => {
  el.onclick = function() {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-link").forEach(t => t.classList.remove("active"));
    document.getElementById(this.getAttribute("href").substring(1)).classList.add("active");
    this.classList.add("active");
  };
});

// AI Chat (Groq API)
document.getElementById("chat-send-btn").onclick = async function() {
  const input = document.getElementById("chat-input").value;
  if (!input) return;
  // Call Groq API with input (function from previous response's script.js)
  const reply = await callGroqAPI(buildPrompt(input, DOMAINS["general"]));
  const msgDiv = document.createElement("div");
  msgDiv.className = "ai-message";
  msgDiv.innerText = reply;
  document.getElementById("chat-messages").appendChild(msgDiv);
  // Save to history
};

// Document Analysis
document.getElementById("doc-analyze-btn").onclick = async function() {
  const file = document.getElementById("doc-upload").files[0];
  if (!file) return;
  const text = await file.text();
  const reply = await callGroqAPI("Analyze and summarize this document: " + text.substring(0,10000));
  document.getElementById("doc-result").innerText = reply;
};

// Guided Image Gen
document.getElementById("img-enhance-btn").onclick = async function() {
  const prompt = document.getElementById("img-prompt").value;
  const enhanced = await callGroqAPI("Rewrite this image prompt for better art: " + prompt);
  document.getElementById("img-prompt").value = enhanced;
};
document.getElementById("img-generate-btn").onclick = async function() {
  const prompt = document.getElementById("img-prompt").value;
  // Use HuggingFace or Google Gemini API for image gen (demo: show placeholder)
  document.getElementById("img-result").innerHTML = `<img src='https://via.placeholder.com/400x200?text=${encodeURIComponent(prompt)}' alt='Generated'/>`;
};

// History panel logic can use localStorage/session to pull past chats/images.
