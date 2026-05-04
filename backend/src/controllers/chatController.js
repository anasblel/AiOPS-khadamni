import Provider from '../models/Provider.js';

const serviceKeywordMap = [
  { name: 'plumbing', terms: ['plumber', 'plumbing', 'plombe', 'plombier'] },
  { name: 'electrical', terms: ['electrical', 'electricity', 'electrician', 'electrical work', 'electric'] },
  { name: 'web development', terms: ['web', 'website', 'site', 'web development', 'frontend', 'backend', 'react', 'node'] },
  { name: 'mobile app', terms: ['mobile', 'app', 'application', 'ios', 'android'] },
  { name: 'design', terms: ['design', 'designer', 'ui', 'ux'] },
  { name: 'marketing', terms: ['marketing', 'advertising', 'ads', 'seo'] },
  { name: 'consulting', terms: ['consult', 'consulting', 'advisor', 'advice'] },
  { name: 'writing', terms: ['write', 'writing', 'copy', 'content'] },
];

const basicIntentMap = [
  { name: 'greeting', terms: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'] },
  { name: 'thanks', terms: ['thank you', 'thanks', 'thx', 'merci'] },
  { name: 'help', terms: ['help', 'need', 'could you', 'can you', 'i want', 'i need'] },
];

const normalizeMessage = (message) =>
  message?.toLowerCase?.().replace(/[\W_]+/g, ' ').trim() || '';

const classifyBasicIntent = (message) => {
  const lowerMessage = normalizeMessage(message);
  return basicIntentMap.find(({ terms }) =>
    terms.some(term => lowerMessage.includes(term))
  )?.name || null;
};

const extractServiceIntent = (message) => {
  const lowerMessage = normalizeMessage(message);
  const found = serviceKeywordMap.find(({ terms }) =>
    terms.some(term => lowerMessage.includes(term))
  );
  return found?.name || null;
};

const providerMatchesIntent = (message, providers) => {
  const intent = extractServiceIntent(message);
  if (!intent) return [];

  return providers.filter(provider =>
    provider.skills.some(skill => {
      const lowerSkill = normalizeMessage(skill);
      if (lowerSkill.includes(intent)) return true;
      const intentTerms = serviceKeywordMap.find(s => s.name === intent)?.terms || [];
      return intentTerms.some(term => lowerSkill.includes(normalizeMessage(term)));
    })
  );
};

export const chat = async (req, res) => {
  // Read env inside the function, not at module load time
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // FIX: use gemini-2.0-flash — gemini-1.5-flash is deprecated on v1beta
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const { message, history = [] } = req.body;

    // 1. Fetch providers from DB
    const providers = await Provider.find({}).populate('user', 'name').lean();
    const providerContext = providers.map(p => ({
      id: p._id,
      name: p.user?.name || 'Unknown',
      skills: p.skills,
      isRemote: p.isRemote,
      hourlyRate: p.hourlyRate,
      currency: p.currency,
      rating: p.rating,
    }));

    // 2. System prompt
    const systemPrompt = `You are an AI assistant for AIOps Freelance, a platform connecting clients with service providers.
Your job is to:
1. Understand what service the client needs
2. Match them with the best providers from the list below
3. Respond in a friendly, concise way (2-4 sentences)
4. If matching providers exist, list them with their rate and skills
5. If no providers match, say the platform is growing

Available providers:
${providerContext.length > 0 ? JSON.stringify(providerContext, null, 2) : 'No providers registered yet.'}

When suggesting a provider always mention their name, skills, rate, and remote/in-person status.
Do NOT make up providers that are not in the list above.`;

    // 3. Build Gemini conversation history
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

    console.log('🤖 AI providers available - Gemini:', !!GEMINI_API_KEY);

    let aiResponse = null;
    let matchedProviders = [];
    let usedFallback = false;

    // Try Gemini first if API key is available
    if (GEMINI_API_KEY) {
      try {
        console.log('🔄 Calling Gemini API...');

        // Retry logic for Gemini
        let geminiResponse;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            geminiResponse = await fetch(GEMINI_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [
                  ...geminiHistory,
                  { role: 'user', parts: [{ text: message }] },
                ],
                generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
              }),
            });
            break;
          } catch (fetchError) {
            console.error(`Gemini API fetch error (attempt ${retryCount + 1}):`, fetchError.message);
            if (retryCount === maxRetries) throw fetchError;
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }

        console.log('Gemini status:', geminiResponse.status);

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that.';
          console.log('✅ Gemini response received');

          // Match provider names mentioned in reply for UI cards
          matchedProviders = providerContext.filter(p =>
            aiResponse.toLowerCase().includes(p.name.toLowerCase())
          );
        } else {
          const errText = await geminiResponse.text();
          console.error('Gemini error body:', errText);

          if (geminiResponse.status === 429) {
            console.log('🔄 Gemini quota exceeded, using local fallback');
            usedFallback = true;
          }
        }
      } catch (geminiError) {
        console.error('❌ Gemini error:', geminiError.message);
      }
    }

    // Use local fallback if Gemini failed or no AI response
    if (!aiResponse) {
      console.log('🏠 Using local fallback response');
      usedFallback = true;
      aiResponse = generateFallbackResponse(message, providerContext);
      matchedProviders = getRelevantProviders(message, providerContext);
    }

    res.json({
      reply: aiResponse,
      matchedProviders: matchedProviders,
      fallback: usedFallback
    });
  } catch (err) {
    console.error('Chat controller error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Fallback response generator when AI API is unavailable
const generateFallbackResponse = (message, providers) => {
  console.log('🤖 Generating fallback response for message:', message.substring(0, 50) + '...');
  const lowerMessage = message.toLowerCase();

  const intent = extractServiceIntent(message);
  const relevantProviders = intent ? providerMatchesIntent(message, providers) : [];
  const basicIntent = classifyBasicIntent(message);

  if (relevantProviders.length > 0) {
    const provider = relevantProviders[0];
    return `I found ${provider.name} who specializes in ${provider.skills.join(', ')}. They charge $${provider.hourlyRate}/${provider.currency} per hour and are ${provider.isRemote ? 'available remotely' : 'available in-person'}. Would you like me to help you connect with them?`;
  }

  if (intent) {
    if (providers.length > 0) {
      return `I understand you're looking for ${intent}. I couldn't find an exact match right now, but we have talented providers available. Could you share more details like budget, location, or schedule?`;
    }

    return `I understand you're looking for ${intent}. I don't currently have a matching provider in the platform, but I can keep an eye out for one. Could you tell me your location, budget, or preferred schedule?`;
  }

  if (basicIntent === 'greeting') {
    return `Hello! 👋 I can help you find the best provider for your needs. What service are you looking for today?`;
  }

  if (basicIntent === 'thanks') {
    return `You're welcome! If you want, tell me the service you need and I'll help match you with a provider.`;
  }

  if (basicIntent === 'help') {
    return `Sure — I can help. What kind of service do you need? For example, plumbing, electrical, web development, or design.`;
  }

  if (providers.length > 0) {
    return `I'm here to help you find the right provider. Tell me what service you need — for example plumbing, electrical, web development, or design.`;
  }

  return `I don't have any providers in the platform yet, but I can still help you describe what you're looking for. Tell me the service and any details like location, budget, or timing.`;
};

// Get relevant providers based on message content
const getRelevantProviders = (message, providers) => {
  console.log('🔍 Finding relevant providers for:', message.substring(0, 50) + '...');
  const relevant = providerMatchesIntent(message, providers).slice(0, 3);

  if (relevant.length > 0) {
    console.log(`✅ Found ${relevant.length} providers matching intent`);
    return relevant;
  }

  console.log('⚠️ No provider matches found for current request');
  return [];
};