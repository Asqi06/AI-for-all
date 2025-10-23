function loadHistoryStats() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  
  const chats = history.filter(h => h.type === 'chat').length;
  const docs = history.filter(h => h.type === 'document').length;
  const images = history.filter(h => h.type === 'image').length;

  document.getElementById('totalChats').textContent = chats;
  document.getElementById('totalDocs').textContent = docs;
  document.getElementById('totalImages').textContent = images;
}

function loadHistory(filter = 'all') {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  const filtered = filter === 'all' ? history : history.filter(h => h.type === filter);

  const container = document.getElementById('historyList');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No ${filter === 'all' ? '' : filter} history found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const icon = item.type === 'chat' ? '💬' : item.type === 'document' ? '📄' : '🎨';
    const date = new Date(item.timestamp).toLocaleString();
    
    return `
      <div class="history-item">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <div class="history-type">${item.type.toUpperCase()}</div>
          <div class="history-input">${item.input.substring(0, 100)}${item.input.length > 100 ? '...' : ''}</div>
          <div class="history-date">${date}</div>
        </div>
        <button class="history-delete" onclick="deleteHistoryItem('${item.timestamp}')">🗑️</button>
      </div>
    `;
  }).join('');
}

function filterHistory(type) {
  // Update active tab
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  
  loadHistory(type);
}

function deleteHistoryItem(timestamp) {
  if (!confirm('Delete this item?')) return;
  
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  history = history.filter(h => h.timestamp !== timestamp);
  localStorage.setItem('history', JSON.stringify(history));
  
  loadHistory();
  loadHistoryStats();
}

function clearAllHistory() {
  if (!confirm('Clear ALL history? This cannot be undone.')) return;
  
  localStorage.setItem('history', '[]');
  loadHistory();
  loadHistoryStats();
  alert('History cleared!');
}

// Load on page load
loadHistoryStats();
loadHistory();
