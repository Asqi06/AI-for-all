// PDF.js CDN version for client-side PDF parsing
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

// Load PDF.js dynamically
function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Extract text from PDF file
async function extractPDFText(file) {
  const pdfjs = await loadPDFJS();
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  
  return fullText.trim();
}

// Extract text from different file types
async function extractTextFromFile(file) {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await extractPDFText(file);
  } else if (fileType.startsWith('text/') || fileName.endsWith('.txt')) {
    return await file.text();
  } else if (fileName.endsWith('.docx')) {
    // For DOCX, we'll use a simple text extraction
    // In a real app, you'd use a library like mammoth.js
    showNotification('DOCX files: Please copy-paste the text for now', 'info');
    return '';
  } else {
    throw new Error('Unsupported file type. Please use PDF or TXT files.');
  }
}
