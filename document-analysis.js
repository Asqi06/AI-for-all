const DOC_API_BASE_URL = 'https://ai-for-everyone-backend.onrender.com/api';

let uploadedDocument = null;

window.uploadDocument = async function() {
  const fileInput = document.getElementById('documentUpload');
  
  if (!fileInput) {
    console.error('File input not found');
    return;
  }
  
  const file = fileInput.files[0];

  if (!file) {
    showDocNotification('Please select a file!', 'warning');
    return;
  }

  showDocNotification('📄 Processing document... This may take a moment.', 'info');

  try {
    let content = '';
    
    // Handle text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      content = await file.text();
    } 
    // Handle PDFs with PDF.js
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
      throw new Error('Could not extract text. Make sure the file contains readable text.');
    }

    uploadedDocument = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: content.trim(),
      uploadDate: new Date().toISOString()
    };

    displayDocumentInfo();

  } catch (error) {
    console.error('Upload error:', error);
    showDocNotification('❌ Upload failed: ' + error.message, 'error');
  }
};

function displayDocumentInfo() {
  if (!uploadedDocument) return;

  const docInfo = document.getElementById('documentInfo');
  const docName = document.getElementById('docName');
  const docSize = document.getElementById('docSize');
  const docType = document.getElementById('docType');
  const docPages = document.getElementById('docPages');
  const docDate = document.getElementById('docDate');

  if (docInfo) docInfo.style.display = 'block';
  if (docName) docName.textContent = uploadedDocument.name;
  if (docSize) docSize.textContent = formatFileSize(uploadedDocument.size);
  if (docType) docType.textContent = uploadedDocument.type || 'Document';
  
  const wordCount = uploadedDocument.content.split(/\s+/).length;
  if (docPages) docPages.textContent = `~${Math.ceil(wordCount / 250)} pages (${wordCount} words)`;
  if (docDate) docDate.textContent = new Date(uploadedDocument.uploadDate).toLocaleString();

  const buttons = document.querySelectorAll('.analysis-section button, .qa-section button');
  const inputs = document.querySelectorAll('.qa-section input');
  
  buttons.forEach(btn => { if (btn) btn.disabled = false; });
  inputs.forEach(inp => { if (inp) inp.disabled = false; });
  
  showDocNotification(`✅ "${uploadedDocument.name}" ready! (${wordCount} words extracted)`, 'success');
}

window.analyzeDocument = async function() {
  if (!uploadedDocument) {
    showDocNotification('Please upload a document first!', 'warning');
    return;
  }

  const summaryEl = document.getElementById('summaryText');
  const resultsDiv = document.getElementById('analysisResults');
  
  if (!summaryEl) {
    showDocNotification('Analysis section not found', 'error');
    return;
  }

  summaryEl.innerHTML = '<p style="text-align:center; color:#666;">⏳ Analyzing (30-60 seconds)...</p>';
  if (resultsDiv) resultsDiv.style.display = 'block';

  try {
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: uploadedDocument.content,
        type: uploadedDocument.type
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
    summaryEl.innerHTML = `<p style="color:#dc2626;">❌ Analysis failed: ${error.message}</p>`;
    showDocNotification('❌ ' + error.message, 'error');
  }
};

window.extractKeyPoints = async function() {
  if (!uploadedDocument) {
    showDocNotification('Please upload a document first!', 'warning');
    return;
  }

  const keyPointsEl = document.getElementById('keyPointsList');
  const keyPointsCard = document.getElementById('keyPointsCard');
  
  if (!keyPointsEl) {
    showDocNotification('Key points section not found', 'error');
    return;
  }

  keyPointsEl.innerHTML = '<li style="list-style:none; color:#666;">⏳ Extracting...</li>';
  if (keyPointsCard) keyPointsCard.style.display = 'block';

  try {
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Extract 5-7 key points about the CONTENT:\n\n${uploadedDocument.content.substring(0, 10000)}`,
        type: uploadedDocument.type
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
  
  if (!questionInput || !qaResults) {
    showDocNotification('Q&A section not found', 'error');
    return;
  }
  
  const question = questionInput.value.trim();
  
  if (!uploadedDocument) {
    showDocNotification('Please upload a document first!', 'warning');
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
  answerDiv.innerHTML = '⏳ Thinking...';
  qaResults.appendChild(answerDiv);

  try {
    const response = await fetch(`${DOC_API_BASE_URL}/analyze-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Document:\n${uploadedDocument.content.substring(0, 10000)}\n\nQuestion: ${question}\n\nAnswer:`,
        type: uploadedDocument.type
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
  
  if (!textArea) {
    showDocNotification('Paste area not found', 'error');
    return;
  }
  
  const text = textArea.value.trim();
  
  if (!text) {
    showDocNotification('Please paste some text first!', 'warning');
    return;
  }

  if (text.length < 50) {
    showDocNotification('Text is too short. Need at least 50 characters.', 'warning');
    return;
  }

  showDocNotification('📄 Processing text...', 'info');

  uploadedDocument = {
    name: 'Pasted Text',
    type: 'text/plain',
    size: text.length,
    content: text,
    uploadDate: new Date().toISOString()
  };

  displayDocumentInfo();
  textArea.value = '';
};

// Proper PDF text extraction using PDF.js
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
        reject(new Error('PDF appears to be empty or image-based. Use a text-based PDF.'));
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
