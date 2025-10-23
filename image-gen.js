// Free Image Generation Providers
const IMAGE_PROVIDERS = {
  'pollinations': {
    name: 'Pollinations FLUX 🌟',
    description: 'Best quality, unlimited, no signup required',
    speed: 'Fast',
    quality: 'Excellent',
    limit: 'Unlimited'
  },
  'puter': {
    name: 'Puter GPT Image-1 ⚡',
    description: 'OpenAI quality, unlimited, super fast',
    speed: 'Very Fast',
    quality: 'Excellent',
    limit: 'Unlimited'
  },
  'together': {
    name: 'Together.AI FLUX 💎',
    description: 'Premium quality, ~500 images/month free',
    speed: 'Ultra Fast',
    quality: 'Best',
    limit: '~500/month'
  },
  'deepai': {
    name: 'DeepAI 🎨',
    description: 'Good quality, unlimited generation',
    speed: 'Medium',
    quality: 'Good',
    limit: 'Unlimited'
  },
  'auto': {
    name: 'Auto (Smart Fallback) 🤖',
    description: 'Automatically picks best available API',
    speed: 'Variable',
    quality: 'Best Available',
    limit: 'Unlimited'
  }
};

let currentProvider = 'auto'; // Default to auto-fallback

function setPrompt(text) {
  document.getElementById('imagePrompt').value = text;
}

function switchProvider(providerId) {
  currentProvider = providerId;
  
  // Update UI
  document.querySelectorAll('.provider-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.provider-btn').classList.add('active');
  
  const provider = IMAGE_PROVIDERS[providerId];
  showNotification(`✅ Switched to ${provider.name}`, 'success');
}

async function enhancePrompt() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) {
    showNotification('Please enter a prompt first!', 'warning');
    return;
  }

  showNotification('✨ Enhancing prompt...', 'info');
  
  try {
    const response = await fetch('http://localhost:3000/api/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
    
    const data = await response.json();
    const enhanced = data.choices[0].message.content.trim();

    document.getElementById('enhancedPromptText').textContent = enhanced;
    document.getElementById('enhancedPromptCard').style.display = 'block';
    showNotification('✨ Prompt enhanced!', 'success');
  } catch (error) {
    console.error('Enhancement error:', error);
    showNotification('Enhancement failed', 'error');
  }
}

function useEnhancedPrompt() {
  const enhanced = document.getElementById('enhancedPromptText').textContent;
  document.getElementById('imagePrompt').value = enhanced;
  document.getElementById('enhancedPromptCard').style.display = 'none';
  showNotification('Enhanced prompt applied!', 'success');
}

async function generateImage() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) {
    showNotification('Please enter a prompt!', 'warning');
    return;
  }

  const resultSection = document.getElementById('imageResultSection');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const generatedImage = document.getElementById('generatedImage');
  const providerInfo = document.getElementById('providerInfo');

  // Store prompt for display
  document.getElementById('usedPrompt').textContent = prompt;
  document.getElementById('genTime').textContent = new Date().toLocaleString();

  resultSection.style.display = 'block';
  loadingSpinner.style.display = 'flex';
  generatedImage.style.display = 'none';

  try {
    const response = await fetch('http://localhost:3000/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        provider: currentProvider === 'auto' ? null : currentProvider
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Display image
    loadingSpinner.style.display = 'none';
    generatedImage.src = data.imageUrl;
    generatedImage.style.display = 'block';

    // Show provider info
    document.getElementById('usedProvider').textContent = data.provider || 'Unknown';
    if (providerInfo) {
      providerInfo.textContent = `Generated with ${data.provider}`;
      providerInfo.style.display = 'block';
    }

    saveToGallery(prompt, data.imageUrl, data.provider);
    saveToHistory('image', prompt, data.imageUrl);
    
    showNotification(`✅ Image generated with ${data.provider}!`, 'success');

  } catch (error) {
    console.error('Generation error:', error);
    loadingSpinner.style.display = 'none';
    showNotification('❌ Generation failed: ' + error.message, 'error');
  }
}


function resetGenerator() {
  document.getElementById('imageResultSection').style.display = 'none';
  document.getElementById('imagePrompt').value = '';
  const enhancedCard = document.getElementById('enhancedPromptCard');
  if (enhancedCard) enhancedCard.style.display = 'none';
}

function downloadImage() {
  const img = document.getElementById('generatedImage');
  
  fetch(img.src)
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-image-${Date.now()}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      showNotification('✅ Image downloaded!', 'success');
    })
    .catch(() => {
      showNotification('Error downloading image', 'error');
    });
}

function shareImage() {
  const img = document.getElementById('generatedImage');
  const prompt = document.getElementById('imagePrompt').value;
  
  if (navigator.share && /mobile/i.test(navigator.userAgent)) {
    navigator.share({
      title: 'AI Generated Image',
      text: `Created with prompt: ${prompt}`,
      url: window.location.href
    }).then(() => showNotification('✅ Shared!', 'success'))
      .catch(() => {});
  } else {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(img.src)
        .then(() => showNotification('✅ Image URL copied!', 'success'))
        .catch(() => showNotification('Error copying', 'error'));
    }
  }
}

function saveToGallery(prompt, url, provider) {
  let gallery = JSON.parse(localStorage.getItem('imageGallery') || '[]');
  gallery.unshift({ 
    prompt, 
    url, 
    provider: provider,
    timestamp: new Date().toISOString() 
  });
  localStorage.setItem('imageGallery', JSON.stringify(gallery.slice(0, 50)));
  loadGallery();
}

function loadGallery() {
  const gallery = JSON.parse(localStorage.getItem('imageGallery') || '[]');
  const container = document.getElementById('imageGallery');
  
  if (!container) return;
  
  if (gallery.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🖼️</div>
        <p>No images generated yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = gallery.map(item => `
    <div class="gallery-item" onclick="viewGalleryImage('${item.url}', '${item.prompt.replace(/'/g, "\\'")}')">
      <img src="${item.url}" alt="${item.prompt}" loading="lazy">
      <div class="gallery-overlay">
        <p class="gallery-prompt">${item.prompt.substring(0, 50)}${item.prompt.length > 50 ? '...' : ''}</p>
        <p class="gallery-provider">${item.provider || 'AI'}</p>
      </div>
    </div>
  `).join('');
}

function viewGalleryImage(url, prompt) {
  window.open(url, '_blank');
}

function saveToHistory(type, input, output) {
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  history.unshift({ type, input, output, timestamp: new Date().toISOString() });
  localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
  updateStats();
}

function updateStats() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  const imageCount = history.filter(h => h.type === 'image').length;
  const imageEl = document.getElementById('imageCount');
  if (imageEl) imageEl.textContent = imageCount;
}

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  updateStats();
});

// Export functions globally for HTML onclick handlers
window.setPrompt = setPrompt;
window.generateImage = generateImage;
window.switchProvider = switchProvider;
window.enhancePrompt = enhancePrompt;
window.useEnhancedPrompt = useEnhancedPrompt;
window.downloadImage = downloadImage;
window.shareImage = shareImage;
window.resetGenerator = resetGenerator;
