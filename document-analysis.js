const DOC_API_BASE_URL = 'https://ai-for-everyone-backend.onrender.com/api';

let uploadedDocuments = []; // Array to store multiple documents
const MAX_FILES = 7;
const MAX_TOTAL_SIZE = 6 * 1024 * 1024; // 6MB in bytes

window.uploadDocuments = async function() {
  const fileInput = document.getElementById('documentUpload');
  
  if (!fileInput || !fileInput.files.length) {
    showDocNotification('Please select files!', 'warning');
    return;
  }
  
  const files = Array.from(fileInput.files);
  
  // Validate file count
  if (files.length > MAX_FILES) {
    showDocNotification(`Maximum ${MAX_FILES} files allowed!`, 'error');
    return;
  }
  
  // Validate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    showDocNotification(`Total size exceeds 6MB limit! Current: ${formatFileSize(totalSize)}`, 'error');
    return;
  }
  
  showDocNotification(`📄 Processing ${files.length} file(s)...`, 'info');
  
  uploadedDocuments = []; // Clear previous uploads
  
  try {
    for (const file of files) {
      let content = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        content = await file.text();
      } 
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        content = await extractTextFromPDF(file);
      }
      else {
        throw new Error(`Unsupported file type: ${file.name}`);
      }
      
      if (content.trim().length < 10) {
        throw new Error(`No text found in: ${file.name}`);
      }
      
      uploadedDocuments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content: content.trim(),
        uploadDate: new Date().toISOString()
      });
    }
    
    displayDocumentsList();
    showDocNotification(`✅ ${uploadedDocuments.length} file(s) uploaded successfully!`, 'success');
    
  } catch (error) {
    console.error('Upload error:', error);
    showDocNotification('❌ ' + error.message, 'error');
  }
};

function displayDocumentsList() {
  if (uploadedDocuments.length === 0) return;
  
  const listSection = document.getElementById('documentsListSection');
  const documentsList = document.getElementById('documentsList');
  const docCount = document.getElementById('docCount');
  const totalSize = document.getElementById('totalSize');
  const totalWords = document.getElementById('totalWords');
  
  if (!documentsList) return;
  
  listSection.style.display = 'block';
  docCount.textContent = uploadedDocuments.length;
  
  const totalSizeBytes = uploadedDocuments.reduce((sum, doc) => sum + doc.size, 0);
  const totalWordCount = uploadedDocuments.reduce((sum, doc) => 
    sum + doc.content.split(/\s+/).length, 0);
  
  totalSize.textContent = formatFileSize(totalSizeBytes);
  totalWords.textContent = totalWordCount.toLocaleString();
  
  documentsList.innerHTML = uploadedDocuments.map((doc, index) => {
    const wordCount = doc.content.split(/\s+/).length;
    return `
      <div class="doc-card">
        <div class="doc-card-header">
          <span class="doc-icon">📄</span>
          <span class="doc-name" title="${doc.name}">${doc.name}</span>
          <button class="btn-icon-delete" onclick="removeDocument(${index})" title="Remove">
            ×
          </button>
        </div>
        <div class="doc-card-info">
          <span>${formatFileSize(doc.size)}</span>
          <span>•</span>
          <span>${wordCount} words</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Enable analysis buttons
  document.getElementById('analyzeBtn').disabled = false;
  document.getElementById('keyPointsBtn').disabled = false;
  document.getElementById('questionInput').disabled = false;
  document.getElementById('askBtn').disabled = false;
}

window.removeDocument = function(index) {
  uploadedDocuments.splice(index, 1);
  
  if (uploadedDocuments.length === 0) {
    document.getElementById('documentsListSection').style.display = 'none';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('keyPointsBtn').disabled = true;
    document.getElementById('questionInput').disabled = true;
    document.getElementById('askBtn').disabled = true;
  } else {
    displayDocumentsList();
  }
  
  showDocNotification('Document removed', 'info');
};

window.clearAllDocuments = function() {
  uploadedDocuments = [];
  document.getElementById('documentsListSection').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('keyPointsBtn').disabled = true;
  document.getElementById('questionInput').disabled = true;
  document.getElementById('askBtn').disabled = true;
  showDocNotification('All documents cleared', 'info');
};

window.analyzeDocuments = async function() {
  if (uploadedDocuments.length === 0) {
    showDocNotification('Please upload documents first!', 'warning');
    return;
  }

  const summaryEl = document.getElementById('summaryText');
  const resultsDiv = document.getElementById('analysisResults');
  
  if (!summaryEl) return;

  summaryEl.innerHTML = '<p style="text-align:center; color:#666;">⏳ Analyzing all documents (may take 60-90 seconds)...</p>';
  resultsDiv.style.display = 'block';

  try {
    // Combine all document contents with labels
    const combinedContent = uploadedDocuments.map((doc, index) => 
      `[Document ${index + 1}: ${doc.name}]\n${doc.content}\n\n`
    ).join('---\n\n');
    
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: combinedContent.substring(0, 15000), // Limit to 15k chars
        type: 'multiple-documents'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI');
    }

    const analysis = data.choices[0].message.content;
    summaryEl.innerHTML = `<div style="line-height: 1.8;">${analysis}</div>`;
    
    showDocNotification('✅ Analysis complete!', 'success');

  } catch (error) {
    console.error('Analysis error:', error);
    summaryEl.innerHTML = `<p style="color:#dc2626;">❌ ${error.message}</p>`;
    showDocNotification('❌ ' + error.message, 'error');
  }
};

window.extractKeyPoints = async function() {
  if (uploadedDocuments.length === 0) {
    showDocNotification('Please upload documents first!', 'warning');
    return;
  }

  const keyPointsEl = document.getElementById('keyPointsList');
  const keyPointsCard = document.getElementById('keyPointsCard');
  
  if (!keyPointsEl) return;

  keyPointsEl.innerHTML = '<li style="list-style:none; color:#666;">⏳ Extracting key points...</li>';
  keyPointsCard.style.display = 'block';

  try {
    const combinedContent = uploadedDocuments.map((doc, index) => 
      `[${doc.name}]\n${doc.content}\n\n`
    ).join('---\n\n');
    
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Extract 7-10 key points from these documents:\n\n${combinedContent.substring(0, 12000)}`,
        type: 'key-points'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response');
    }

    const keyPoints = data.choices[0].message.content;
    
    const points = keyPoints.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(line => line.length > 15);

    if (points.length > 0) {
      keyPointsEl.innerHTML = points.map(point => `<li>${point}</li>`).join('');
    } else {
      keyPointsEl.innerHTML = `<li style="list-style:none;">${keyPoints}</li>`;
    }
    
    showDocNotification('✅ Key points extracted!', 'success');

  } catch (error) {
    console.error('Key points error:', error);
    keyPointsEl.innerHTML = `<li style="color:#dc2626; list-style:none;">❌ ${error.message}</li>`;
    showDocNotification('❌ ' + error.message, 'error');
  }
};

window.askQuestion = async function() {
  const questionInput = document.getElementById('questionInput');
  const qaResults = document.getElementById('qaResults');
  
  if (!questionInput || !qaResults) return;
  
  const question = questionInput.value.trim();
  
  if (uploadedDocuments.length === 0) {
    showDocNotification('Please upload documents first!', 'warning');
    return;
  }

  if (!question) {
    showDocNotification('Please enter a question!', 'warning');
    return;
  }

  qaResults.style.display = 'block';
  
  const questionDiv = document.createElement('div');
  questionDiv.className = 'qa-item question';
  questionDiv.textContent = `Q: ${question}`;
  qaResults.appendChild(questionDiv);

  const answerDiv = document.createElement('div');
  answerDiv.className = 'qa-item answer';
  answerDiv.innerHTML = '⏳ Searching through all documents...';
  qaResults.appendChild(answerDiv);

  try {
    const combinedContent = uploadedDocuments.map((doc, index) => 
      `[Document ${index + 1}: ${doc.name}]\n${doc.content}\n\n`
    ).join('---\n\n');
    
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Documents:\n${combinedContent.substring(0, 12000)}\n\nQuestion: ${question}\n\nAnswer based on the documents:`,
        type: 'qa'
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response');
    }

    const answer = data.choices[0].message.content;
    answerDiv.innerHTML = `<strong>A:</strong> ${answer}`;
    
    questionInput.value = '';
    showDocNotification('✅ Answer generated!', 'success');

  } catch (error) {
    console.error('Q&A error:', error);
    answerDiv.innerHTML = `<span style="color:#dc2626;">❌ ${error.message}</span>`;
    showDocNotification('❌ ' + error.message, 'error');
  }
};

window.uploadPastedText = async function() {
  const textArea = document.getElementById('pastedText');
  if (!textArea) return;
  
  const text = textArea.value.trim();
  
  if (!text) {
    showDocNotification('Please paste some text first!', 'warning');
    return;
  }

  if (text.length < 50) {
    showDocNotification('Text is too short.', 'warning');
    return;
  }

  uploadedDocuments = [{
    name: 'Pasted Text',
    type: 'text/plain',
    size: text.length,
    content: text,
    uploadDate: new Date().toISOString()
  }];

  displayDocumentsList();
  textArea.value = '';
  showDocNotification('✅ Text uploaded!', 'success');
};

async function extractTextFromPDF(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }
      
      if (fullText.trim().length < 50) {
        reject(new Error('PDF appears to be empty or image-based.'));
      } else {
        resolve(fullText.trim());
      }
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      reject(new Error('Failed to extract text from PDF.'));
    }
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showDocNotification(message, type = 'info') {
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
