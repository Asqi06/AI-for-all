const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ========== ROOT & HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    message: '🚀 AI For Everyone Backend is Running!',
    status: 'online',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      generateImage: '/api/generate-image',
      analyzeDocument: '/api/analyze-document',
      enhancePrompt: '/api/enhance-prompt'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== ENHANCE PROMPT ENDPOINT ==========
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('✨ Enhancing prompt...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing detailed, creative image prompts. Enhance the user\'s prompt to be more descriptive, vivid, and specific while keeping the core idea. Keep it under 100 words.'
          },
          {
            role: 'user',
            content: `Enhance this image prompt: ${prompt}`
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Prompt enhanced');
    res.json(data);

  } catch (error) {
    console.error('Enhance prompt error:', error);
    res.status(500).json({ 
      error: 'Prompt enhancement failed', 
      details: error.message 
    });
  }
});

// ========== IMAGE GENERATION ENDPOINT ==========
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🎨 Generating image for:', prompt);

    const encodedPrompt = encodeURIComponent(prompt);
    
    // Try multiple free APIs in order
    const freeAPIs = [
      {
        id: 'pollinations-flux',
        name: 'Pollinations FLUX',
        url: `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=1024&nologo=true&enhance=true`
      },
      {
        id: 'pollinations-turbo',
        name: 'Pollinations Turbo',
        url: `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&width=1024&height=1024&nologo=true`
      },
      {
        id: 'pollinations-default',
        name: 'Pollinations Default',
        url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`
      }
    ];

    // Try each API
    for (const api of freeAPIs) {
      try {
        console.log(`Trying ${api.name}...`);
        
        // Return the URL immediately - Pollinations generates on-demand
        const imageUrl = api.url;
        
        console.log(`✅ Image URL generated with ${api.name}`);
        return res.json({
          imageUrl: imageUrl,
          provider: api.name,
          providerId: api.id,
          success: true
        });
      } catch (error) {
        console.log(`${api.name} failed, trying next...`);
        continue;
      }
    }

    throw new Error('All image generation APIs failed');

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Image generation failed', 
      details: error.message 
    });
  }
});

// ========== CHAT ENDPOINT ==========
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `
You are an AI tutor for students. Your answers must be perfectly formatted, visually clean, and easy to read.

FORMATTING RULES:
1. Always start with a brief 1-2 line summary if the answer is complex.
2. Use <h2> tags for main section headings.
3. Use <h3> tags for sub-sections if needed.
4. Use <p> tags for paragraphs—keep each paragraph 2-3 sentences maximum.
5. Use <ul> and <li> for bullet lists (never use asterisks or dashes).
6. Use <strong> for emphasis (never use ** or *).
7. Add blank lines between sections by using </p><p> or proper spacing.
8. For processes or steps, use numbered lists with <ol> and <li>.
9. NEVER write congested blocks of text. Break everything into digestible chunks.

TONE AND STYLE:
- Write like a friendly tutor explaining to a student.
- Skip filler phrases like "Certainly!", "Here's the answer:", or "As an AI...".
- Be direct, clear, and engaging.
- Use simple language—avoid jargon unless explaining it.

Always prioritize readability and visual appeal. Students should enjoy reading your answers.
`;

    const messages = [{ role: 'system', content: systemPrompt }];
    
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

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${errorData}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed', details: error.message });
  }
});

// ========== DOCUMENT ANALYSIS ENDPOINT ==========
app.post('/api/analyze-document', async (req, res) => {
  req.setTimeout(120000); // 2 minutes timeout
  
  try {
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key is required' });
    }

    console.log('📄 Analyzing document...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Analyze the given document and provide a clear summary, key points, and insights.'
          },
          {
            role: 'user',
            content: `Analyze this document:\n\n${content.substring(0, 15000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Document analyzed');
    res.json(data);

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
});
