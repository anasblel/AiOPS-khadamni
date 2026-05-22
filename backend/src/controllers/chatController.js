import Provider, { JOB_FAMILIES } from '../models/Provider.js';

const GEMINI_URL = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

async function callGemini(systemPrompt, userMessage, history = []) {
  const geminiHistory = history.map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  const response = await fetch(GEMINI_URL(), {
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

export const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Build rich provider context for the AI — Feature 1, 2, 3 data included
    const providers = await Provider.find({}).populate('user', 'name').lean();
    const today = new Date().toISOString().split('T')[0];

    const providerContext = providers.map(p => ({
      id: p._id,
      name: p.user?.name || 'Unknown',
      jobFamily: p.jobFamily,
      specialty: p.specialty,
      skills: p.skills,
      city: p.city,                           // Feature 2
      isRemote: p.isRemote,
      hourlyRate: p.hourlyRate,
      currency: p.currency,
      availability: p.availability,           // Feature 3
      rating: p.rating,
    }));

    // Build taxonomy summary for the AI
    const familySummary = JOB_FAMILIES.map(f =>
      `${f.label} (${f.specialties.join(', ')})`
    ).join('\n');

    const systemPrompt = `You are an intelligent assistant for "AIOps Khadamni", a Tunisian freelance platform.
Today's date: ${today}

Platform service families:
${familySummary}

Available providers (JSON):
${providers.length > 0 ? JSON.stringify(providerContext, null, 2) : 'No providers registered yet.'}

Your job:
1. Understand what the client needs (service type, location/city — Feature 2, date/time — Feature 3, budget).
2. For location: if the client mentions a city (e.g. Ariana, Tunis, Sfax), match providers by their city field OR isRemote=true. Always prioritize nearby city matches.
3. For availability: match providers whose availability includes the requested day (day name like "monday" or specific date YYYY-MM-DD) and whose slot start <= requested time and slot end >= requested time.
4. For service family: use the taxonomy above to understand what family/specialty the client needs. Do NOT suggest plumbers for coding requests.
5. If no exact city match, mention the closest provider and note they may need to travel or be remote.
6. Out-of-scope requests (taxi, hotel, restaurant, flight): politely explain this platform only offers professional/freelance services.
7. Reply in the same language as the client (French or English).
8. When suggesting a provider: mention name, specialty, city, rate, and availability.
9. Keep replies concise (3-5 sentences max). Do NOT use markdown bullets.
10. Never invent provider data not in the list above.`;

    let aiReply = '';
    let matchedProviders = [];
    let usedFallback = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        aiReply = await callGemini(systemPrompt, message, history);
        // Match provider names mentioned in reply for UI cards
        matchedProviders = providerContext.filter(p =>
          aiReply.toLowerCase().includes(p.name.toLowerCase())
        );
      } catch (err) {
        console.error('Gemini error:', err.message);
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    if (!aiReply) {
      usedFallback = true;
      aiReply = generateFallback(message, providerContext);
      matchedProviders = getRelevantProviders(message, providerContext);
    }

    res.json({ reply: aiReply, matchedProviders, fallback: usedFallback });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── Local fallback (when Gemini is unavailable) ──────────────────────────────
function generateFallback(message, providers) {
  const lower = message.toLowerCase();
  const greetings = ['hello', 'hi', 'hey', 'bonjour', 'salut'];
  if (greetings.some(g => lower.includes(g))) {
    return "Hello! I can help you find a service provider. What do you need? (e.g. plumber in Ariana, React developer, math tutor)";
  }
  const relevant = getRelevantProviders(message, providers);
  if (relevant.length > 0) {
    const p = relevant[0];
    return `I found ${p.name} (${p.specialty || p.skills?.[0] || 'specialist'}) in ${p.city || 'your area'}, ${p.hourlyRate} ${p.currency}/hr. Would you like to book them?`;
  }
  return "I understand you need a service. Could you give more details? For example: type of service, city, date, and budget.";
}

function getRelevantProviders(message, providers) {
  const lower = message.toLowerCase();
  return providers.filter(p => {
    const searchIn = [
      p.jobFamily, p.specialty, ...(p.skills || []), p.city
    ].join(' ').toLowerCase();
    return lower.split(' ').some(word => word.length > 3 && searchIn.includes(word));
  }).slice(0, 3);
}