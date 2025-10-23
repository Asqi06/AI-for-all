// Load current API key status
function loadKeyStatus() {
  const groqKey = localStorage.getItem('groq_api_key');
  const hfKey = localStorage.getItem('huggingface_api_key');
  
  // Update Groq status
  const groqStatus = document.getElementById('groqStatus');
  const groqInput = document.getElementById('groqKeyInput');
  
  if (groqKey) {
    groqStatus.textContent = '✅ Active';
    groqStatus.className = 'status-badge active';
    groqInput.value = groqKey;
  } else {
    groqStatus.textContent = '❌ Not Set';
    groqStatus.className = 'status-badge inactive';
  }
  
  // Update HF status
  const hfStatus = document.getElementById('hfStatus');
  const hfInput = document.getElementById('hfKeyInput');
  
  if (hfKey) {
    hfStatus.textContent = '✅ Active';
    hfStatus.className = 'status-badge active';
    hfInput.value = hfKey;
  } else {
    hfStatus.textContent = '❌ Not Set';
    hfStatus.className = 'status-badge inactive';
  }
}

// Save Groq API Key
function saveGroqKey() {
  const key = document.getElementById('groqKeyInput').value.trim();
  
  if (!key) {
    showNotification('Please enter an API key', 'warning');
    return;
  }
  
  if (!key.startsWith('gsk_')) {
    showNotification('⚠️ Groq API keys usually start with "gsk_"', 'warning');
  }
  
  localStorage.setItem('groq_api_key', key);
  loadKeyStatus();
  showNotification('✅ Groq API key saved successfully!', 'success');
}

// Remove Groq API Key
function removeGroqKey() {
  if (!confirm('Remove Groq API key? You will need to add it again to use AI features.')) {
    return;
  }
  
  localStorage.removeItem('groq_api_key');
  document.getElementById('groqKeyInput').value = '';
  loadKeyStatus();
  showNotification('Groq API key removed', 'info');
}

// Save Hugging Face API Key
function saveHfKey() {
  const key = document.getElementById('hfKeyInput').value.trim();
  
  if (!key) {
    showNotification('Please enter an API key', 'warning');
    return;
  }
  
  if (!key.startsWith('hf_')) {
    showNotification('⚠️ Hugging Face tokens usually start with "hf_"', 'warning');
  }
  
  localStorage.setItem('huggingface_api_key', key);
  loadKeyStatus();
  showNotification('✅ Hugging Face API key saved successfully!', 'success');
}

// Remove Hugging Face API Key
function removeHfKey() {
  if (!confirm('Remove Hugging Face API key? You will need to add it again to generate images.')) {
    return;
  }
  
  localStorage.removeItem('huggingface_api_key');
  document.getElementById('hfKeyInput').value = '';
  loadKeyStatus();
  showNotification('Hugging Face API key removed', 'info');
}

// Toggle password visibility
function toggleVisibility(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Load usage statistics
function loadStats() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  
  const chats = history.filter(h => h.type === 'chat').length;
  const docs = history.filter(h => h.type === 'document').length;
  const images = history.filter(h => h.type === 'image').length;
  
  document.getElementById('totalChats').textContent = chats;
  document.getElementById('totalDocs').textContent = docs;
  document.getElementById('totalImages').textContent = images;
}

// Clear all data
function clearAllData() {
  const confirm1 = confirm('⚠️ WARNING: This will delete ALL your data!\n\n• Chat history\n• Document analysis\n• Generated images\n• API keys\n\nAre you sure?');
  
  if (!confirm1) return;
  
  const confirm2 = confirm('This action cannot be undone. Delete everything?');
  
  if (!confirm2) return;
  
  // Clear everything
  localStorage.clear();
  
  showNotification('✅ All data cleared', 'success');
  
  // Reload page after 1 second
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1500);
}

// Notification
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
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadKeyStatus();
  loadStats();
});
