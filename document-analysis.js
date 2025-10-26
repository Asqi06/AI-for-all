const API_BASE_URL = 'https://ai-for-everyone-backend.onrender.com/api';

let uploadedDocument = null;

async function uploadDocument() {
  const fileInput = document.getElementById('documentUpload');
  const file = fileInput.files[0];

  if (!file) {
    showNotification('Please select a file!', 'warning');
    return;
  }

  showNotification('📄 Processing document...', 'info');

  try {
    let content = '';
    
    // Handle text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      content = await file.text();
    } 
    // Handle PDFs - simple extraction
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      content = await extractTextFromPDF(file);
    }
    // Handle other text formats
    else if (file.type.includes('text')) {
      content = await file.text();
    }
    else {
      throw new Error('Please upload a PDF or TXT file');
    }

    if (!content || content.trim().length < 10) {
      throw new Error('Could not extract text from document. Make sure the PDF contains readable text.');
    }

    uploadedDocument = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: content.trim(),
      uploadDate: new Date().toISOString()
    };

    displayDocumentInfo();
    showNotification('✅ Document uploaded successfully!', 'success');

  } catch (error) {
    console.error('Upload error:', error);
    showNotification('❌ Upload failed: ' + error.message, 'error');
  }
}

function displayDocumentInfo() {
  if (!uploadedDocument) return;

  document.getElementById('documentInfo').style.display = 'block';
  document.getElementById('docName').textContent = uploadedDocument.name;
  document.getElementById('docSize').textContent = formatFileSize(uploadedDocument.size);
  document.getElementById('docType').textContent = uploadedDocument.type || 'Document';
  document.getElementById('docDate').textContent = new Date(uploadedDocument.uploadDate).toLocaleString();

  // Show word count
  const wordCount = uploadedDocument.content.split(/\s+/).length;
  document.getElementById('docPages').textContent = `~${Math.ceil(wordCount / 250)} pages`;

  // Enable analysis buttons
  document.querySelectorAll('.analysis-section button').forEach(btn => {
    btn.disabled = false;
  });
}

async function analyzeDocument() {
  if (!uploadedDocument) {
    showNotification('Please upload a document first!', 'warning');
    return;
  }

  const summaryEl = document.getElementById('summaryText');
  summaryEl.innerHTML = '<p style="text-align:center; color:#666;">⏳ Analyzing document... (may take 30-60 seconds)</p>';
  document.getElementById('analysisResults').style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: uploadedDocument.content,
        type: uploadedDocument.type
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from AI');
    }

    const analysis = data.choices[0].message.content;
    summaryEl.innerHTML = `<div style="line-height: 1.8;">${analysis}</div>`;
    
    showNotification('✅ Analysis complete!', 'success');

  } catch (error) {
    console.error('Analysis error:', error);
    summaryEl.innerHTML = `<p style="color:#dc2626;">❌ Analysis failed: ${error.message}</p>`;
    showNotification('❌ Analysis failed: ' + error.message, 'error');
  }
}

async function extractKeyPoints() {
  if (!uploadedDocument) {
    showNotification('Please upload a document first!', 'warning');
    return;
  }

  const keyPointsEl = document.getElementById('keyPointsList');
  keyPointsEl.innerHTML = '<li style="list-style:none; color:#666;">⏳ Extracting key points...</li>';
  document.getElementById('keyPointsCard').style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Extract 5-7 key bullet points from this document:\n\n${uploadedDocument.content.substring(0, 10000)}`,
        type: uploadedDocument.type
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response');
    }

    const keyPoints = data.choices[0].message.content;
    
    // Parse bullet points
    const points = keyPoints.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(line => line.length > 10);

    if (points.length > 0) {
      keyPointsEl.innerHTML = points.map(point => `<li>${point}</li>`).join('');
    } else {
      keyPointsEl.innerHTML = `<li style="list-style:none;">${keyPoints}</li>`;
    }
    
    showNotification('✅ Key points extracted!', 'success');

  } catch (error) {
    console.error('Key points error:', error);
    keyPointsEl.innerHTML = `<li style="color:#dc2626; list-style:none;">❌ Failed: ${error.message}</li>`;
    showNotification('❌ Failed to extract key points', 'error');
  }
}

async function askQuestion() {
  const question = document.getElementById('questionInput').value.trim();
  
  if (!uploadedDocument) {
    showNotification('Please upload a document first!', 'warning');
    return;
  }

  if (!question) {
    showNotification('Please enter a question!', 'warning');
    return;
  }

  const qaResults = document.getElementById('qaResults');
  qaResults.style.display = 'block';
  
  const questionDiv = document.createElement('div');
  questionDiv.className = 'qa-item question';
  questionDiv.textContent = `Q: ${question}`;
  qaResults.appendChild(questionDiv);

  const answerDiv = document.createElement('div');
  answerDiv.className = 'qa-item answer';
  answerDiv.innerHTML = '⏳ Thinking...';
  qaResults.appendChild(answerDiv);

  try {
    const response = await fetch(`${API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Document:\n${uploadedDocument.content.substring(0, 10000)}\n\nQuestion: ${question}\n\nProvide a clear answer based only on the document above:`,
        type: uploadedDocument.type
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response');
    }

    const answer = data.choices[0].message.content;
    answerDiv.innerHTML = `<strong>A:</strong> ${answer}`;
    
    document.getElementById('questionInput').value = '';
    showNotification('✅ Answer generated!', 'success');

  } catch (error) {
    console.error('Q&A error:', error);
    answerDiv.innerHTML = `<span style="color:#dc2626;">❌ Failed: ${error.message}</span>`;
    showNotification('❌ Failed to answer question', 'error');
  }
}

// Simple PDF text extraction
async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const contents = e.target.result;
      
      // Try to extract text using simple string parsing
      // This works for text-based PDFs (not scanned images)
      try {
        let text = '';
        const lines = contents.split('\n');
        
        for (let line of lines) {
          // Remove binary data and keep readable text
          const cleanLine = line.replace(/[^\x20-\x7E]/g, ' ').trim();
          if (cleanLine.length > 3) {
            text += cleanLine + ' ';
          }
        }
        
        if (text.trim().length < 50) {
          reject(new Error('PDF appears to be empty or image-based. Please use a text-based PDF.'));
        } else {
          resolve(text.trim());
        }
      } catch (err) {
        reject(new Error('Failed to parse PDF'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
// Handle pasted text
async function uploadPastedText() {
  const text = document.getElementById('pastedText').value.trim();
  
  if (!text) {
    showNotification('Please paste some text first!', 'warning');
    return;
  }

  if (text.length < 50) {
    showNotification('Text is too short. Please paste at least 50 characters.', 'warning');
    return;
  }

  showNotification('📄 Processing text...', 'info');

  uploadedDocument = {
    name: 'Pasted Text',
    type: 'text/plain',
    size: text.length,
    content: text,
    uploadDate: new Date().toISOString()
  };

  displayDocumentInfo();
  showNotification('✅ Text uploaded successfully!', 'success');
  
  // Clear textarea
  document.getElementById('pastedText').value = '';
}

// Export all functions
window.uploadDocument = uploadDocument;
window.uploadPastedText = uploadPastedText;
window.analyzeDocument = analyzeDocument;
window.extractKeyPoints = extractKeyPoints;
window.askQuestion = askQuestion;

