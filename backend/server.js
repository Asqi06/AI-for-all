const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ---- THE SYSTEM PROMPT ----
const systemPrompt = `
You are an AI tutor for students. Your answers must be perfectly formatted, visually clean, and easy to read.

FORMATTING RULES:
1. Always start with a brief 1-2 line summary if the answer is complex.
2. Use <h2> tags for main section headings (e.g., <h2>Introduction to HTTP</h2>).
3. Use <h3> tags for sub-sections if needed.
4. Use <p> tags for paragraphs—keep each paragraph 2-3 sentences maximum.
5. Use <ul> and <li> for bullet lists (never use asterisks or dashes).
6. Use <strong> for emphasis (never use ** or *).
7. Add blank lines between sections by using </p><p> or proper spacing.
8. For processes or steps, use numbered lists with <ol> and <li>.
9. If explaining methods, features, or options—create separate bullet points for each.
10. NEVER write congested blocks of text. Break everything into digestible chunks.

TONE AND STYLE:
- Write like a friendly tutor explaining to a student.
- Skip filler phrases like "Certainly!", "Here's the answer:", or "As an AI...".
- Be direct, clear, and engaging.
- Use simple language—avoid jargon unless explaining it.

STRUCTURE EXAMPLE:
<h2>Topic Name</h2>
<p>Brief introduction or summary.</p>

<h3>Key Points</h3>
<ul>
<li>Point 1 explanation</li>
<li>Point 2 explanation</li>
<li>Point 3 explanation</li>
</ul>

<h3>How It Works</h3>
<ol>
<li>Step 1 description</li>
<li>Step 2 description</li>
<li>Step 3 description</li>
</ol>

<p>Closing summary or takeaway.</p>

Always prioritize readability and visual appeal. Students should enjoy reading your answers.
`;


// ---- YOUR CHAT ENDPOINT ----
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    // Build message history array for Groq/Llama
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // If you want to keep history add it; otherwise only the current message:
    if (Array.isArray(conversationHistory) && conversationHistory.length) {
      messages.push(...conversationHistory);
    }
    if (message) {
      messages.push({ role: 'user', content: message });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.75,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed', details: error.message });
  }
});

// ==================== DOCUMENT ANALYSIS ENDPOINT ====================
app.post('/api/analyze-document', async (req, res) => {
  try {
    const { content, type } = req.body; // type: 'summary' or 'keypoints'

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    let prompt;
    if (type === 'summary') {
      prompt = `Provide a clear, well-structured summary of this document in 2-3 paragraphs (max 200 words):\n\n${content.substring(0, 20000)}`;
    } else if (type === 'keypoints') {
      prompt = `Extract 5-7 most important key points from this document. Format as a numbered list:\n\n${content.substring(0, 20000)}`;
    } else {
      prompt = content;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant that analyzes documents.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// ==================== IMAGE GENERATION ENDPOINT ====================
// Production-Ready Image Generation (Only Free APIs)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const encodedPrompt = encodeURIComponent(prompt);

    // ONLY FREE UNLIMITED APIs
    const freeAPIs = [
      {
        id: 'pollinations',
        name: 'Pollinations FLUX',
        execute: async () => ({
          imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=1024&nologo=true&enhance=true`
        })
      },
      {
        id: 'pollinations-turbo',
        name: 'Pollinations Turbo',
        execute: async () => ({
          imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&width=1024&height=1024&nologo=true`
        })
      }
    ];

    for (const api of freeAPIs) {
      try {
        const result = await api.execute();
        return res.json({ ...result, provider: api.name, success: true });
      } catch (error) {
        continue;
      }
    }

    throw new Error('All APIs failed');
  } catch (error) {
    res.status(500).json({ error: 'Generation failed' });
  }
});


// ==================== ENHANCE PROMPT ENDPOINT ====================
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert at writing detailed AI image generation prompts. Enhance prompts with style, lighting, composition, and artistic details. Keep under 100 words. Return ONLY the enhanced prompt.' },
          { role: 'user', content: `Enhance this image prompt: "${prompt}"` }
        ],
        temperature: 0.9,
        max_tokens: 250
      })
    });

    const data = await response.json();
    res.json(data);
} catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ error: 'Enhancement failed', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
});