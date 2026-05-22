import { OpenAI } from 'openai';

// ─── Hugging Face Router caller (Primary) ────────────────────────────────────
export async function callHuggingFace(systemPrompt, userMessage, history = []) {
  const token = process.env.HF_TOKEN;
  if (!token || token.trim() === '') throw new Error('Hugging Face token not configured.');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://router.huggingface.co/sambanova/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages,
      max_tokens: 512,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Hugging Face API ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Gemini Caller (Secondary Fallback) ──────────────────────────────────────
export async function callGemini(systemPrompt, userMessage, history = []) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '') throw new Error('Gemini key not configured.');

  const geminiHistory = history.map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── OpenAI Caller (Tertiary Fallback) ───────────────────────────────────────
export async function callOpenAI(systemPrompt, userMessage, history = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') throw new Error('OpenAI key not configured.');

  const openai = new OpenAI({ apiKey });
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    })),
    { role: 'user', content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 512,
    temperature: 0.7
  });

  return completion.choices?.[0]?.message?.content || '';
}

// ─── Shared Unified AI caller chain with fallback ────────────────────────────
export async function callAiChain(systemPrompt, userMessage) {
  // Try Hugging Face Router
  if (process.env.HF_TOKEN && process.env.HF_TOKEN.trim() !== '') {
    try {
      console.log('Chain: Attempting Hugging Face...');
      const reply = await callHuggingFace(systemPrompt, userMessage);
      if (reply) return reply;
    } catch (err) {
      console.error('Chain: Hugging Face API call failed:', err.message);
    }
  }

  // Try Gemini
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      console.log('Chain: Attempting Gemini fallback...');
      const reply = await callGemini(systemPrompt, userMessage);
      if (reply) return reply;
    } catch (err) {
      console.error('Chain: Gemini API call failed:', err.message);
    }
  }

  // Try OpenAI
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
    try {
      console.log('Chain: Attempting OpenAI fallback...');
      const reply = await callOpenAI(systemPrompt, userMessage);
      if (reply) return reply;
    } catch (err) {
      console.error('Chain: OpenAI API call failed:', err.message);
    }
  }

  throw new Error('AI Chain: All models and tokens failed or were not configured.');
}
