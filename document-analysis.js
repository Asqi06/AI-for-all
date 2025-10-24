const API_BASE_URL = 'https://ai-for-everyone-backend.onrender.com/api';

let uploadedDocument = null;

async function uploadDocument() {
  const fileInput = document.getElementById('documentUpload');
  const file = fileInput.files[0];

  if (!file) {
    showNotification('Please select a file!', 'warning');
    return;
  }

  // Show loading
  showNotification('📄 Processing document...', 'info');

  try {
    let content = '';
    
    if (file.type === 'application/pdf') {
      // Use PDF.js to extract text
      content = await extractTextFromPDF(file);
    } else if (file.type === 'text/plain') {
      content = await file.text();
    } else {
      throw new Error('Unsupported file type. Please upload PDF or TXT files.');
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Could not extract text from document');
    }

    uploadedDocument = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: content,
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
  document.getElementById('docType').textContent = uploadedDocument.type;
  document.getElementById('docDate').textContent = new Date(uploadedDocument.uploadDate).toLocaleString();

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
  summaryEl.innerHTML = '<p style="text-align:center;">⏳ Analyzing document... (may take 30-60 seconds on first request)</p>';
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
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from API');
    }

    const analysis = data.choices[0].message.content;
    summaryEl.innerHTML = analysis;
    
    showNotification('✅ Analysis complete!', 'success');

  } catch (error) {
    console.error('Analysis error:', error);
    summaryEl.innerHTML = `<p style="color:red;">❌ Analysis failed: ${error.message}</p>`;
    showNotification('❌ Analysis failed: ' + error.message, 'error');
  }
}

async function extractKeyPoints() {
  if (!uploadedDocument) {
    showNotification('Please upload a document first!', 'warning');
    return;
  }

  const keyPointsEl = document.getElementById('keyPointsList');
  keyPointsEl.innerHTML = '<li style="list-style:none;">⏳ Extracting key points...</li>';
  document.getElementById('keyPointsCard').style.display = 'block';

  try {
    const response = await fetch(`${API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Extract 5-7 key points from this document in bullet format:\n\n${uploadedDocument.content.substring(0, 10000)}`,
        type: uploadedDocument.type
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format');
    }

    const keyPoints = data.choices[0].message.content;
    
    // Parse bullet points
    const points = keyPoints.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);

    keyPointsEl.innerHTML = points.map(point => `<li>${point}</li>`).join('');
    
    showNotification('✅ Key points extracted!', 'success');

  } catch (error) {
    console.error('Key points error:', error);
    keyPointsEl.innerHTML = `<li style="color:red; list-style:none;">❌ Failed: ${error.message}</li>`;
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
        content: `Document:\n${uploadedDocument.content.substring(0, 10000)}\n\nQuestion: ${question}\n\nAnswer based on the document above:`,
        type: uploadedDocument.type
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format');
    }

    const answer = data.choices[0].message.content;
    answerDiv.innerHTML = `A: ${answer}`;
    
    document.getElementById('questionInput').value = '';
    showNotification('✅ Answer generated!', 'success');

  } catch (error) {
    console.error('Q&A error:', error);
    answerDiv.innerHTML = `<span style="color:red;">❌ Failed: ${error.message}</span>`;
    showNotification('❌ Failed to answer question', 'error');
  }
}

async function extractTextFromPDF(file) {
  // Simple fallback - in production you'd use PDF.js
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const typedarray = new Uint8Array(e.target.result);
      
      try {
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        resolve(fullText);
      } catch (error) {
        reject(new Error('Failed to parse PDF: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
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

// Export functions
window.uploadDocument = uploadDocument;
window.analyzeDocument = analyzeDocument;
window.extractKeyPoints = extractKeyPoints;
window.askQuestion = askQuestion;
