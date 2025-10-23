// Dev "bypass everything" for usage/time limits
if (location.hostname === "localhost" || location.hostname.startsWith("127")) {
  localStorage.removeItem('usageData');
  window.canPerformAction = () => true;
  window.showUsageLimitsNotification = () => {};
  window.displayUsageLimits = () => {};
  window.recordUsage = () => {};
  window.getRemainingUsage = () => ({ images: 999, documents: 999, chatMinutes: 999 });
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      document.querySelectorAll('button, input, textarea').forEach(el => {
        el.disabled = false;
        el.removeAttribute('disabled');
      });
    }, 300);
  });
}

// Backend API URL
const API_BASE_URL = 'https://ai-for-everyone-backend.onrender.com/api';


// ----------------- Chat Functionality -----------------
function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage('user', message);
  input.value = '';
  const loadingId = addLoadingMessage();

  fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
  .then(res => res.json())
  .then(data => {
    removeLoadingMessage(loadingId);
    if (!data.choices || !data.choices.length) throw new Error('No response');
    const reply = data.choices[0].message.content;
    addChatMessage('ai', reply);
    saveToHistory('chat', message, reply);
  })
  .catch(error => {
    removeLoadingMessage(loadingId);
    addChatMessage('ai', 'Sorry, I encountered an error. Please try again.');
    console.error('Chat error:', error);
  });
}

function addChatMessage(type, content) {
  const messagesContainer = document.getElementById('chatMessages');
  const welcome = messagesContainer.querySelector('.welcome-message');
  if (welcome) welcome.remove();
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.innerHTML = `
    <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
    <div class="message-content">${content}</div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addLoadingMessage() {
  const messagesContainer = document.getElementById('chatMessages');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai';
  loadingDiv.id = 'loading-msg';
  loadingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="loading-dots">Thinking...</div>
    </div>
  `;
  messagesContainer.appendChild(loadingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return 'loading-msg';
}

function removeLoadingMessage(id) {
  const loading = document.getElementById(id);
  if (loading) loading.remove();
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}
window.handleKeyPress = handleKeyPress;

function startNewChat() {
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">👋</div>
      <h3>Hello! How can I help you today?</h3>
      <p>Ask me anything - from simple questions to complex tasks!</p>
    </div>
  `;
}

// ----------------- Document Upload Handler -----------------
async function handleDocUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  showNotification('Analyzing document...', 'info');
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, type: 'summary' })
    });
    const data = await response.json();
    const analysis = data.choices[0].message.content;
    showNotification('✅ Document analyzed!', 'success');
    saveToHistory('document', file.name, analysis);
  } catch (error) {
    console.error('Document analysis error:', error);
    showNotification('❌ Analysis failed', 'error');
  }
  event.target.value = '';
}
window.handleDocUpload = handleDocUpload;

// ----------------- Image Generation Modal -----------------
function showImageGen() {
  document.getElementById('imageModal').classList.add('active');
}
function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}
window.showImageGen = showImageGen;
window.closeImageModal = closeImageModal;

// ----------------- Image Generation Function -----------------
async function generateImage() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) {
    showNotification('Please enter a description!', 'warning');
    return;
  }
  const resultDiv = document.getElementById('imageResult');
  resultDiv.innerHTML = '<p>Generating image... (This may take 20-30 seconds)</p>';
  try {
    const response = await fetch(`${API_BASE_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'flux-schnell' })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    resultDiv.innerHTML = `<img src="${data.imageUrl}" alt="Generated" style="max-width: 100%; border-radius: 12px;">`;
    saveToHistory('image', prompt, data.imageUrl);
    showNotification('✅ Image generated!', 'success');
  } catch (error) {
    console.error('Image generation error:', error);
    resultDiv.innerHTML = '<p style="color: #f44;">Generation failed. Please try again.</p>';
    showNotification('❌ Generation failed', 'error');
  }
}
window.generateImage = generateImage;

// ----------------- Prompt Enhancement Function -----------------
async function enhancePrompt() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) {
    showNotification('Please enter a prompt first!', 'warning');
    return;
  }
  showNotification('✨ Enhancing prompt...', 'info');
  try {
    const response = await fetch(`${API_BASE_URL}/enhance-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    const enhanced = data.choices[0].message.content.trim();
    document.getElementById('imagePrompt').value = enhanced;
    showNotification('✨ Prompt enhanced!', 'success');
  } catch (error) {
    console.error('Enhancement error:', error);
    showNotification('Enhancement failed', 'error');
  }
}
window.enhancePrompt = enhancePrompt;

// ----------------- History System -----------------
function saveToHistory(type, input, output) {
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  history.unshift({ type, input, output, timestamp: new Date().toISOString() });
  localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
  updateStats();
}

function updateStats() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  const chatCount = history.filter(h => h.type === 'chat').length;
  const docCount = history.filter(h => h.type === 'document').length;
  const imageCount = history.filter(h => h.type === 'image').length;
  const chatEl = document.getElementById('chatCount');
  const docEl = document.getElementById('docCount');
  const imageEl = document.getElementById('imageCount');
  if (chatEl) chatEl.textContent = chatCount;
  if (docEl) docEl.textContent = docCount;
  if (imageEl) imageEl.textContent = imageCount;
}

// ----------------- Notification System -----------------
function showNotification(message, type = 'info') {
  document.querySelectorAll('.notification').forEach(n => n.remove());
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ----------------- Backend Health Check & Dev Mode Status -----------------
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-cache'
    });
    const data = await response.json();
    console.log('✅ Backend connected:', data.status);
  } catch (error) {
    // Silent fail - just log to console, no notification
    console.warn('⚠️ Backend health check failed');
  }
}


function showDevMode() {
  if (API_BASE_URL.includes('localhost')) {
    const devIndicator = document.createElement('div');
    devIndicator.innerHTML = `
      <div style="position: fixed; top: 10px; left: 10px; background: #ff6b35; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; z-index: 9999;">
        🚧 DEV MODE
      </div>
    `;
    document.body.appendChild(devIndicator);
  }
}

// ----------------- Initialize on page load -----------------
document.addEventListener('DOMContentLoaded', () => {
  // Only run on dashboard pages, not login or index
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const dashboardPages = ['dashboard.html', 'chat.html', 'document.html', 'image.html', 'history.html', 'settings.html'];
  
  if (dashboardPages.includes(currentPage)) {
    initializeDashboard();
    updateStats();
  }
  
  if (typeof loadUserInfo === 'function' && currentPage !== 'login.html') {
    loadUserInfo();
  }
});


// ----------------- Export handlers to HTML -----------------
window.sendMessage = sendMessage;
window.startNewChat = startNewChat;

// Mobile Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
}

// Close sidebar when clicking a nav link on mobile
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar .nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    });
  });
});

window.toggleSidebar = toggleSidebar;
