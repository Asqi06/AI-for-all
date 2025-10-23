let uploadedDocuments = [];
const MAX_FILES = 7;
const MAX_TOTAL_SIZE = 6 * 1024 * 1024; // 6MB

async function handleDocumentUpload(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // Validate file count and size
  if (uploadedDocuments.length + files.length > MAX_FILES) {
    showNotification(`Maximum ${MAX_FILES} files allowed. You have ${uploadedDocuments.length} already.`, 'error');
    return;
  }
  const totalSize = [...uploadedDocuments, ...files].reduce((sum, doc) => sum + (doc.file ? doc.file.size : doc.size), 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    showNotification(`Total size cannot exceed 6MB. Current size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`, 'error');
    return;
  }

  showNotification('Processing files...', 'info');
  for (const file of files) {
    try {
      const allowedTypes = ['.pdf', '.txt', '.docx'];
      const fileName = file.name.toLowerCase();
      const isAllowed = allowedTypes.some(type => fileName.endsWith(type));
      if (!isAllowed) {
        showNotification(`${file.name}: Only PDF, TXT, and DOCX files are supported`, 'warning');
        continue;
      }
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 10) {
        showNotification(`${file.name}: File is empty or unreadable`, 'warning');
        continue;
      }
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      uploadedDocuments.push({
        file,
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        content: text,
        wordCount: wordCount
      });
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      showNotification(`${file.name}: ${error.message}`, 'error');
    }
  }
  if (uploadedDocuments.length > 0) {
    displayUploadedDocuments();
    showNotification(`✅ ${uploadedDocuments.length} document(s) uploaded successfully!`, 'success');
  }
  event.target.value = '';
}

function displayUploadedDocuments() {
  const container = document.getElementById('uploadedDocsList');
  if (!container) {
    const analysisSection = document.getElementById('analysisSection') || createAnalysisSection();
    const uploadedSection = document.createElement('div');
    uploadedSection.id = 'uploadedSection';
    uploadedSection.className = 'uploaded-section';
    uploadedSection.innerHTML = `
      <div class="section-header">
        <h3>📄 Uploaded Documents (${uploadedDocuments.length}/${MAX_FILES})</h3>
        <button class="btn-secondary" onclick="analyzeAllDocuments()">Analyze All</button>
      </div>
      <div id="uploadedDocsList" class="uploaded-docs-list"></div>
    `;
    analysisSection.parentNode.insertBefore(uploadedSection, analysisSection);
  }
  const docsList = document.getElementById('uploadedDocsList');
  docsList.innerHTML = uploadedDocuments.map((doc, index) => `
    <div class="uploaded-doc-card">
      <div class="doc-info">
        <div class="doc-icon">${getFileIcon(doc.name)}</div>
        <div class="doc-details">
          <div class="doc-name">${doc.name}</div>
          <div class="doc-meta">${doc.size} • ${doc.wordCount} words</div>
        </div>
      </div>
      <div class="doc-actions">
        <button class="btn-secondary small" onclick="analyzeDocument(${index})">Analyze</button>
        <button class="btn-danger small" onclick="removeDocument(${index})">×</button>
      </div>
    </div>
  `).join('');
  const header = document.querySelector('#uploadedSection .section-header h3');
  if (header) {
    header.textContent = `📄 Uploaded Documents (${uploadedDocuments.length}/${MAX_FILES})`;
  }
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch(ext) {
    case 'pdf': return '📕';
    case 'txt': return '📝';
    case 'docx': return '📘';
    default: return '📄';
  }
}

function removeDocument(index) {
  uploadedDocuments.splice(index, 1);
  if (uploadedDocuments.length === 0) {
    const uploadedSection = document.getElementById('uploadedSection');
    if (uploadedSection) uploadedSection.remove();
  } else {
    displayUploadedDocuments();
  }
  showNotification('Document removed', 'info');
}

async function analyzeDocument(index) {
  const doc = uploadedDocuments[index];
  if (!doc) return;

  const analysisSection = createAnalysisSection();
  analysisSection.style.display = 'block';
  analysisSection.scrollIntoView({ behavior: 'smooth' });

  document.getElementById('docName').textContent = doc.name;
  document.getElementById('docSize').textContent = doc.size;
  document.getElementById('wordCount').textContent = doc.wordCount;

  document.getElementById('summaryResult').innerHTML = '<div class="loading-dots">📖 Analyzing document...</div>';
  document.getElementById('keyPointsResult').innerHTML = '<div class="loading-dots">🎯 Extracting key points...</div>';

  try {
    const summaryPrompt = `Please provide a clear, well-structured summary of this document in 2-3 paragraphs (max 200 words). Focus on the main topics, key findings, and important details:\n\n${doc.content.substring(0, 20000)}`;
    const summary = await callAnalysisAPI(summaryPrompt);

    document.getElementById('summaryResult').innerHTML = summary.replace(/\n/g, '<br>');
    const keyPointsPrompt = `Extract 5-7 most important key points from this document. Format as a numbered list with clear, concise explanations:\n\n${doc.content.substring(0, 20000)}`;
    const keyPoints = await callAnalysisAPI(keyPointsPrompt);
    document.getElementById('keyPointsResult').innerHTML = keyPoints.replace(/\n/g, '<br>');
    window.currentAnalyzedDocument = doc;

    saveToHistory('document', doc.name, summary);
    loadRecentDocs();
    showNotification('✅ Document analyzed successfully!', 'success');
  } catch (error) {
    console.error('Analysis error:', error);
    document.getElementById('summaryResult').innerHTML = `<div style="color: #f44;">Error: ${error.message}</div>`;
    document.getElementById('keyPointsResult').innerHTML = `<div style="color: #f44;">Analysis failed</div>`;
    showNotification('❌ Analysis failed: ' + error.message, 'error');
  }
}

async function analyzeAllDocuments() {
  if (uploadedDocuments.length === 0) {
    showNotification('No documents to analyze', 'warning');
    return;
  }
  showNotification('Analyzing all documents...', 'info');
  for (let i = 0; i < uploadedDocuments.length; i++) {
    await analyzeDocument(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function analyzeText() {
  const text = document.getElementById('pasteText').value.trim();
  if (!text) {
    showNotification('Please paste some text first!', 'warning');
    return;
  }
  if (text.length < 10) {
    showNotification('Text too short. Please paste at least 10 characters.', 'warning');
    return;
  }
  const tempDoc = {
    name: 'Pasted Text',
    size: (new Blob([text]).size / 1024).toFixed(2) + ' KB',
    content: text,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length
  };
  uploadedDocuments.push(tempDoc);
  displayUploadedDocuments();
  analyzeDocument(uploadedDocuments.length - 1);
}

async function askQuestion() {
  if (!uploadedDocuments.length) {
    showNotification('Please upload at least one document first', 'warning');
    return;
  }

  const question = document.getElementById('questionInput').value.trim();
  if (!question) {
    showNotification('Please enter a question', 'warning');
    return;
  }

  const qaResults = document.getElementById('qaResults');

  // Add question
  const questionDiv = document.createElement('div');
  questionDiv.className = 'qa-item question';
  questionDiv.textContent = 'Q: ' + question;
  qaResults.appendChild(questionDiv);

  // Show loading
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'qa-item answer loading';
  loadingDiv.innerHTML = '<div class="loading-dots">🤔 Thinking...</div>';
  qaResults.appendChild(loadingDiv);

  qaResults.scrollTop = qaResults.scrollHeight;

  try {
    // Join the text of all currently uploaded docs for context
    const allDocsText = uploadedDocuments.map(doc => doc.content).join('\n\n---\n\n');

    // Send to backend
    const response = await fetch('http://localhost:3000/api/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `You have the following documents:\n\n${allDocsText}\n\nUser question: ${question}`,
        type: "custom"
      })
    });

    if (!response.ok) throw new Error('Backend request failed');
    const data = await response.json();
    const answer = data.choices[0].message.content.trim();

    loadingDiv.remove();
    const answerDiv = document.createElement('div');
    answerDiv.className = 'qa-item answer';
    answerDiv.innerHTML = 'A: ' + answer.replace(/\n/g, '<br>');
    qaResults.appendChild(answerDiv);
    qaResults.scrollTop = qaResults.scrollHeight;
  } catch (error) {
    loadingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'qa-item answer';
    errorDiv.innerHTML = '<span style="color:#f44;">A: Error getting answer. Please try again.</span>';
    qaResults.appendChild(errorDiv);
  }

  document.getElementById('questionInput').value = '';
}


function createAnalysisSection() {
  let analysisSection = document.getElementById('analysisSection');
  if (!analysisSection) {
    analysisSection = document.createElement('div');
    analysisSection.id = 'analysisSection';
    analysisSection.className = 'analysis-section';
    analysisSection.innerHTML = `
      <div class="analysis-header">
        <h2>Analysis Results</h2>
        <button class="btn-secondary" onclick="clearAnalysis()">Clear</button>
      </div>

      <div class="analysis-grid">
        <div class="info-card">
          <div class="info-header">
            <span class="info-icon">📋</span>
            <h3>Document Info</h3>
          </div>
          <div class="info-content">
            <div class="info-row">
              <span class="info-label">File Name:</span>
              <span class="info-value" id="docName">-</span>
            </div>
            <div class="info-row">
              <span class="info-label">File Size:</span>
              <span class="info-value" id="docSize">-</span>
            </div>
            <div class="info-row">
              <span class="info-label">Word Count:</span>
              <span class="info-value" id="wordCount">-</span>
            </div>
          </div>
        </div>

        <div class="result-card">
          <div class="card-header">
            <span class="card-icon">✨</span>
            <h3>AI Summary</h3>
          </div>
          <div class="card-content">
            <div id="summaryResult" class="result-text">Ready for analysis...</div>
          </div>
        </div>

        <div class="result-card">
          <div class="card-header">
            <span class="card-icon">🎯</span>
            <h3>Key Points</h3>
          </div>
          <div class="card-content">
            <div id="keyPointsResult" class="result-text">Ready for analysis...</div>
          </div>
        </div>
      </div>

      <div class="qa-section">
        <h3>Ask Questions About This Document</h3>
        <div class="qa-input-container">
          <input type="text" id="questionInput" placeholder="What would you like to know?" onkeydown="handleQuestionKeyPress(event)">
          <button class="btn-primary" onclick="askQuestion()">Ask</button>
        </div>
        <div id="qaResults" class="qa-results"></div>
      </div>
    `;
    document.querySelector('.main-content').appendChild(analysisSection);
  }
  return analysisSection;
}

function handleQuestionKeyPress(event) {
  if (event.key === 'Enter') {
    askQuestion();
  }
}

function clearAnalysis() {
  const analysisSection = document.getElementById('analysisSection');
  if (analysisSection) analysisSection.style.display = 'none';
  const uploadedSection = document.getElementById('uploadedSection');
  if (uploadedSection) uploadedSection.remove();
  uploadedDocuments = [];
  window.currentAnalyzedDocument = null;
  document.getElementById('pasteText').value = '';
  document.getElementById('docFileInput').value = '';
  showNotification('Analysis cleared', 'info');
}

// This replaces all Groq direct logic on the frontend!
async function callAnalysisAPI(prompt) {
  const response = await fetch('http://localhost:3000/api/analyze-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: prompt, type: 'custom' })
  });
  if (!response.ok) throw new Error('Analysis failed');
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function saveToHistory(type, input, output) {
  let history = JSON.parse(localStorage.getItem('history') || '[]');
  history.unshift({
    type,
    input,
    output,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
  updateDashboardStats();
}

function updateDashboardStats() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  const docCount = history.filter(h => h.type === 'document').length;
  const chatCount = history.filter(h => h.type === 'chat').length;
  const imageCount = history.filter(h => h.type === 'image').length;
  const docEl = document.getElementById('docCount');
  const chatEl = document.getElementById('chatCount');
  const imageEl = document.getElementById('imageCount');
  if (docEl) docEl.textContent = docCount;
  if (chatEl) chatEl.textContent = chatCount;
  if (imageEl) imageEl.textContent = imageCount;
}

function loadRecentDocs() {
  const history = JSON.parse(localStorage.getItem('history') || '[]');
  const docs = history.filter(h => h.type === 'document').slice(0, 5);
  const container = document.getElementById('recentDocsList');
  if (!container) return;
  if (docs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No documents analyzed yet</p>
      </div>
    `;
    return;
  }
  container.innerHTML = docs.map(doc => `
    <div class="recent-doc-item">
      <div class="doc-icon">📄</div>
      <div class="doc-info">
        <div class="doc-name">${doc.input}</div>
        <div class="doc-date">${new Date(doc.timestamp).toLocaleString()}</div>
      </div>
    </div>
  `).join('');
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

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  loadRecentDocs();
  updateDashboardStats();
});
