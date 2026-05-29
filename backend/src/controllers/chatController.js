import Provider, { JOB_FAMILIES } from '../models/Provider.js';
import JobFamily from '../models/JobFamily.js';
import { callHuggingFace, callGemini, callOpenAI } from '../utils/ai.js';


// ─── Main Controller ────────────────────────────────────────────────────────
export const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Fetch registered providers dynamically
    const providers = await Provider.find({}).populate('user', 'name').lean();
    const today = new Date().toISOString().split('T')[0];

    // Look up families up front so we can attach human labels.
    let allFamilies = await JobFamily.find({}).lean();
    if (allFamilies.length === 0) {
      await JobFamily.insertMany(JOB_FAMILIES);
      allFamilies = await JobFamily.find({}).lean();
    }
    const familyLabelById = (id) => allFamilies.find(f => f.id === id)?.label || id;

    const providerContext = providers.map(p => {
      const rawProfessions = (p.professions && p.professions.length > 0)
        ? p.professions
        : (p.jobFamily ? [{ family: p.jobFamily, specialties: p.specialties || (p.specialty ? [p.specialty] : []) }] : []);
      const professions = rawProfessions.map(prof => ({
        family: prof.family,
        familyLabel: familyLabelById(prof.family),
        specialties: prof.specialties || [],
      }));
      return {
        id: p._id,
        name: p.user?.name || 'Unknown',
        jobFamily: p.jobFamily,
        jobFamilies: p.jobFamilies && p.jobFamilies.length > 0
          ? p.jobFamilies
          : (p.jobFamily ? [p.jobFamily] : []),
        specialty: p.specialty,
        specialties: p.specialties || [],
        professions,
        skills: p.skills,
        city: p.city,
        workMode: p.workMode,
        isRemote: p.workMode === 'remote' || p.workMode === 'both',
        hourlyRate: p.hourlyRate,
        currency: p.currency,
        availability: p.availability,
        rating: p.rating,
      };
    });

    // Build taxonomy summary for the AI dynamically (reuse the families we
    // already loaded above to attach labels to provider contexts).
    const families = allFamilies;
    const familySummary = families.map(f =>
      `${f.label} (${f.specialties.join(', ')})`
    ).join('\n');

    const systemPrompt = `You are an intelligent assistant for "AIOps Khadamni", a Tunisian freelance platform.
Today's date: ${today}

Platform service families:
${familySummary}

Available providers (JSON):
${providers.length > 0 ? JSON.stringify(providerContext, null, 2) : 'No providers registered yet.'}

Your job:
1. Understand what the client needs (service type, location/city, date/time, budget).
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

    // 1. Try Hugging Face Router
    if (process.env.HF_TOKEN && process.env.HF_TOKEN.trim() !== '') {
      try {
        console.log('Attempting Hugging Face...');
        aiReply = await callHuggingFace(systemPrompt, message, history);
        matchedProviders = providerContext.filter(p =>
          aiReply.toLowerCase().includes(p.name.toLowerCase())
        );
      } catch (err) {
        console.error('Hugging Face API call failed:', err.message);
      }
    }

    // 2. Try Gemini
    if (!aiReply && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        console.log('Attempting Gemini fallback...');
        aiReply = await callGemini(systemPrompt, message, history);
        matchedProviders = providerContext.filter(p =>
          aiReply.toLowerCase().includes(p.name.toLowerCase())
        );
      } catch (err) {
        console.error('Gemini API call failed:', err.message);
      }
    }

    // 3. Try OpenAI
    if (!aiReply && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
      try {
        console.log('Attempting OpenAI fallback...');
        aiReply = await callOpenAI(systemPrompt, message, history);
        matchedProviders = providerContext.filter(p =>
          aiReply.toLowerCase().includes(p.name.toLowerCase())
        );
      } catch (err) {
        console.error('OpenAI API call failed:', err.message);
      }
    }

    // 4. Smart Local NLU Fallback (Offline/No keys/Quota exceeded)
    if (!aiReply) {
      console.log('Using Smart Local NLU Fallback...');
      usedFallback = true;
      const localResult = generateSmartLocalFallback(message, providerContext, families);
      aiReply = localResult.reply;
      matchedProviders = localResult.matchedProviders;
    }

    res.json({ reply: aiReply, matchedProviders, fallback: usedFallback });
  } catch (err) {
    console.error('Chat controller error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── Levenshtein Distance Helper for Fuzzy String Matching ──────────────────
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const d = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // Deletion
        d[i][j - 1] + 1,       // Insertion
        d[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  return d[m][n];
}

// Find the longest common prefix between two strings
function commonPrefixLength(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// Check if a user's typed word fuzzy-matches a target word/phrase in our DB tags
function wordMatchesPhraseFuzzy(userWord, targetPhrase) {
  if (!userWord || !targetPhrase) return false;
  const u = userWord.toLowerCase().trim();
  const t = targetPhrase.toLowerCase().trim();
  
  // Direct inclusion match
  if (t.includes(u) || u.includes(t)) return true;
  
  // Check against individual words in target phrase
  const targetWords = t.split(/[\s,.\-/]+/);
  for (const tw of targetWords) {
    if (tw.length <= 2) {
      if (u === tw) return true;
      continue;
    }

    // Common prefix match (e.g. plumber <-> plumbing share "plumb")
    const prefixLen = commonPrefixLength(u, tw);
    if (prefixLen >= 4) return true;

    // Levenshtein fuzzy match
    const dist = levenshteinDistance(u, tw);
    const maxAllowedDist = tw.length > 5 ? 2 : 1;
    if (dist <= maxAllowedDist) return true;
  }
  return false;
}

// ─── Smart Local NLU (Database-aware conversational helper) ─────────────────
function generateSmartLocalFallback(message, providers, families = []) {
  const lowerMsg = message.toLowerCase();

  // 1. Check Greetings
  const greetings = ['hello', 'hi', 'hey', 'bonjour', 'salut', 'yo', 'welcome', 'morning', 'evening'];
  const isGreeting = greetings.some(g => {
    const regex = new RegExp(`\\b${g}\\b`, 'i');
    return regex.test(lowerMsg);
  });

  const uniqueCities = [...new Set(providers.map(p => p.city).filter(Boolean))];

  // Build a comprehensive service list from job families, specialties, and skills
  const allFamilyIds = providers.flatMap(p => {
    const ids = new Set();
    if (p.jobFamily) ids.add(p.jobFamily);
    (p.jobFamilies || []).forEach(id => ids.add(id));
    (p.professions || []).forEach(prof => { if (prof.family) ids.add(prof.family); });
    return [...ids];
  });
  const jobFamilyLabels = [...new Set(allFamilyIds.map(id => {
    const family = families.find(f => f.id === id);
    return family ? family.label : id;
  }).filter(Boolean))];
  const uniqueSpecialties = [...new Set(providers.flatMap(p => {
    const set = new Set();
    if (p.specialty) set.add(p.specialty);
    (p.specialties || []).forEach(s => set.add(s));
    (p.professions || []).forEach(prof => (prof.specialties || []).forEach(s => set.add(s)));
    return [...set];
  }).filter(Boolean))];
  const uniqueSkills = [...new Set(providers.flatMap(p => p.skills || []).filter(Boolean))];
  // Merge all into a deduplicated display list
  const allServices = [...new Set([...jobFamilyLabels, ...uniqueSpecialties, ...uniqueSkills])];

  if (isGreeting) {
    let reply = "Hello! I am your interactive AI assistant for AIOps Khadamni. I can help you find and book freelance services in Tunisia.\n\n";
    if (allServices.length > 0) {
      reply += `Currently, we have talented providers registered for services like **${allServices.slice(0, 6).join(', ')}** and more`;
      if (uniqueCities.length > 0) {
        reply += `, located in **${uniqueCities.join(', ')}**`;
      }
      reply += ". Tell me what service and location you need! For example: *'I need a plumber in Ariana'* or *'looking for a coder'*.";
    } else {
      reply += "Describe the service you are looking for (e.g. plumber, developer, tutor), and I'll find the best match for you!";
    }
    return { reply, matchedProviders: [] };
  }

  // 2. Check out-of-scope
  const outOfScopeKeywords = ['taxi', 'hotel', 'flight', 'restaurant', 'food', 'pizza', 'burger', 'delivery'];
  const isOutOfScope = outOfScopeKeywords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(lowerMsg);
  });

  if (isOutOfScope) {
    return {
      reply: "I understand you need that service, but AIOps Khadamni is a professional freelancing and tutoring platform. We only offer professional/freelance services (like coding, plumbing, teaching, designing, etc.) and do not provide taxi, hotel, or food deliveries.",
      matchedProviders: []
    };
  }

  // 3. Parse and extract entities using fuzzy matching
  const words = lowerMsg.replace(/[?,.!]/g, '').split(/\s+/).filter(w => w.length >= 3);

  let matchedCity = null;
  let matchedServiceWord = null; // can be jobFamily, specialty, or skill
  let matchedMatchKind = null;   // 'family' | 'specialty' | 'skill' — what the user's query matched on

  // Match city
  for (const word of words) {
    const foundCity = uniqueCities.find(c => wordMatchesPhraseFuzzy(word, c));
    if (foundCity) {
      matchedCity = foundCity;
      break;
    }
  }

  // Helper: collect every family id this provider belongs to (legacy + multi-family).
  const familiesOf = (p) => {
    const ids = new Set();
    if (p.jobFamily) ids.add(p.jobFamily);
    (p.jobFamilies || []).forEach(id => ids.add(id));
    (p.professions || []).forEach(prof => { if (prof.family) ids.add(prof.family); });
    return [...ids];
  };
  const specialtiesOf = (p) => {
    const set = new Set();
    if (p.specialty) set.add(p.specialty);
    (p.specialties || []).forEach(s => set.add(s));
    (p.professions || []).forEach(prof => (prof.specialties || []).forEach(s => set.add(s)));
    return [...set];
  };

  // Build matching dictionaries.
  const jobFamilyIds = [...new Set(providers.flatMap(familiesOf).filter(Boolean))];
  const jobFamilyLabelsForMatch = jobFamilyIds.map(id => {
    const family = families.find(f => f.id === id);
    return family ? family.label : id;
  });
  const specialties = [...new Set(providers.flatMap(specialtiesOf).filter(Boolean))];
  const skills = [...new Set(providers.flatMap(p => p.skills || []).filter(Boolean))];

  // PRIORITY 1 — job family label (e.g. "Plumbing", "Software & Tech").
  for (const word of words) {
    const idx = jobFamilyLabelsForMatch.findIndex(label => wordMatchesPhraseFuzzy(word, label));
    if (idx !== -1) {
      matchedServiceWord = jobFamilyLabelsForMatch[idx];
      matchedMatchKind = 'family';
      break;
    }
  }

  // PRIORITY 2 — job family id (e.g. "plumbing", "software").
  if (!matchedServiceWord) {
    for (const word of words) {
      const foundId = jobFamilyIds.find(id => wordMatchesPhraseFuzzy(word, id));
      if (foundId) {
        const family = families.find(f => f.id === foundId);
        matchedServiceWord = family ? family.label : foundId;
        matchedMatchKind = 'family';
        break;
      }
    }
  }

  // PRIORITY 3 — specialty.
  if (!matchedServiceWord) {
    for (const word of words) {
      const foundSpec = specialties.find(s => wordMatchesPhraseFuzzy(word, s));
      if (foundSpec) {
        matchedServiceWord = foundSpec;
        matchedMatchKind = 'specialty';
        break;
      }
    }
  }

  // PRIORITY 4 — free-form skill tag.
  if (!matchedServiceWord) {
    for (const word of words) {
      const foundSkill = skills.find(s => wordMatchesPhraseFuzzy(word, s));
      if (foundSkill) {
        matchedServiceWord = foundSkill;
        matchedMatchKind = 'skill';
        break;
      }
    }
  }

  // Annotator: when a specialty hit, surface BOTH the family and the specialty
  // in the result payload so the UI can render them clearly.
  const familyLabelOf = (id) => (families.find(f => f.id === id)?.label) || id;
  const annotateProviders = (list) => list.map(p => {
    if (matchedMatchKind !== 'specialty' || !matchedServiceWord) return p;
    const profession = (p.professions || []).find(prof =>
      (prof.specialties || []).some(s => wordMatchesPhraseFuzzy(matchedServiceWord, s))
    );
    const familyId = profession?.family || p.jobFamily;
    return {
      ...p,
      matchedFamily: familyId ? familyLabelOf(familyId) : null,
      matchedSpecialty: matchedServiceWord,
    };
  });

  // Unified service-match predicate (any of family / specialty / skill).
  const matchesServiceFor = (p) => {
    const provFamilies = familiesOf(p);
    const provSpecs = specialtiesOf(p);
    const familyLabels = provFamilies.map(id => families.find(f => f.id === id)?.label || '');
    return (
      provFamilies.some(id => wordMatchesPhraseFuzzy(matchedServiceWord, id)) ||
      familyLabels.some(l => l && wordMatchesPhraseFuzzy(matchedServiceWord, l)) ||
      provSpecs.some(s => wordMatchesPhraseFuzzy(matchedServiceWord, s)) ||
      (p.skills && p.skills.some(s => wordMatchesPhraseFuzzy(matchedServiceWord, s)))
    );
  };

  // 4. Generate response based on matched entities
  if (matchedServiceWord && matchedCity) {
    // Both service and city matched!
    const matchedProviders = providers.filter(p => {
      const cityMatch = p.city && p.city.toLowerCase() === matchedCity.toLowerCase();
      return cityMatch && matchesServiceFor(p);
    });

    if (matchedProviders.length > 0) {
      const kindLabel = matchedMatchKind === 'family' ? 'job family' : matchedMatchKind === 'specialty' ? 'specialty' : 'service';
      return {
        reply: `I found matching providers for the ${kindLabel} **${matchedServiceWord}** in **${matchedCity}**! I have shown ${matchedProviders.length === 1 ? 'their profile' : 'their profiles'} below so you can review their skills and book them directly.`,
        matchedProviders: annotateProviders(matchedProviders),
      };
    } else {
      // Service exists, and city exists, but no provider does both.
      const serviceProviders = providers.filter(matchesServiceFor);

      if (serviceProviders.length > 0) {
        const citiesList = [...new Set(serviceProviders.map(p => p.city).filter(Boolean))];
        const remoteCount = serviceProviders.filter(p => p.isRemote).length;
        let reply = `I found providers offering **${matchedServiceWord}**, but none are located directly in **${matchedCity}**.\n\n`;
        if (remoteCount > 0) {
          reply += `However, we have **${remoteCount}** provider(s) who offer remote services. I've shown them below!`;
        } else {
          reply += `However, they are available in other cities like **${citiesList.join(', ')}**. I've shown them below in case they can travel or work with you.`;
        }
        return {
          reply,
          matchedProviders: annotateProviders(serviceProviders.slice(0, 3)),
        };
      }
    }
  }

  if (matchedServiceWord && !matchedCity) {
    const serviceProviders = providers.filter(matchesServiceFor);

    if (serviceProviders.length > 0) {
      const citiesList = [...new Set(serviceProviders.map(p => p.city).filter(Boolean))];
      const kindLabel = matchedMatchKind === 'family' ? 'job family' : matchedMatchKind === 'specialty' ? 'specialty' : 'service';
      let reply = `I found providers for the ${kindLabel} **${matchedServiceWord}**! Which city are you looking to hire in? We currently have matches in **${citiesList.join(', ')}**, and some who work remotely.`;
      return {
        reply,
        matchedProviders: annotateProviders(serviceProviders.slice(0, 3)),
      };
    } else {
      return {
        reply: `We don't have any providers offering **${matchedServiceWord}** registered at the moment. However, we have providers in other fields like **${allServices.slice(0, 4).join(', ')}**. What other service might you need?`,
        matchedProviders: []
      };
    }
  }

  if (!matchedServiceWord && matchedCity) {
    const cityProviders = providers.filter(p => p.city && p.city.toLowerCase() === matchedCity.toLowerCase());

    if (cityProviders.length > 0) {
      const cityServices = [...new Set(cityProviders.flatMap(p => {
        const labels = familiesOf(p).map(id => families.find(f => f.id === id)?.label || '');
        return [...labels, ...specialtiesOf(p), ...(p.skills || [])].filter(Boolean);
      }))];

      let reply = `We have providers located in **${matchedCity}**! They offer services like **${cityServices.slice(0, 5).join(', ')}**. What kind of service or specialist are you looking for?`;
      return {
        reply,
        matchedProviders: cityProviders.slice(0, 3)
      };
    } else {
      let reply = `We don't have any registered providers in **${matchedCity}** yet. However, we have providers in other cities like **${uniqueCities.slice(0, 3).join(', ')}** who can work remotely. What service do you need?`;
      return {
        reply,
        matchedProviders: []
      };
    }
  }

  // 5. Default generic response (with hints)
  let fallbackReply = "I understand you are looking for assistance. Could you tell me more about what you need? For example, specify: \n" +
    "- The type of service (e.g. plumber, math tutor, web developer)\n" +
    "- The location or if you prefer remote work\n\n" +
    "This helps me find the perfect match for you in our database!";
  
  if (allServices.length > 0) {
    fallbackReply += `\n\n*(Tip: Try typing keywords like **${allServices.slice(0, 4).join(', ')}**)*`;
  }
  
  return {
    reply: fallbackReply,
    matchedProviders: []
  };
}