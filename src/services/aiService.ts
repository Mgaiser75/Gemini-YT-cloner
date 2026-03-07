
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AISettings, ModelConfig } from "./aiConfig";

const MASTER_SYSTEM_PROMPT = `You are an elite YouTube content strategist,
competitive intelligence analyst, and AI video production director.

RULES:
→ SEO-FIRST: every title leads with a search keyword. "7 Stoic Habits for
  Anxiety" not "Ancient Wisdom." Search intent before branding, always.
→ SPECIFIC: never say "improve quality" — name the exact failure and the fix.
  Never say "better SEO" — name the exact keyword gap and the exact new title.
→ SUPERIOR: every output must outperform the specific competitor. State the
  exact mechanism (keyword + search volume + CPM estimate), not vague advice.
→ RETENTION: every hook = bold claim + pattern interrupt + open loop.
  Re-hook the viewer every 60–90 seconds. State the retention mechanism.
→ JSON: when asked for JSON, output ONLY valid JSON. No markdown fences.
  No explanation before or after. Start with { or [ and end with } or ].`;

interface CacheEntry { calls: number; hits: number; saved: number; }
type CacheStats = Record<string, CacheEntry>;
const CACHE_KEY = 'ytcloner_cache_stats';

function _updateCache(provider: string, task: string, hitTokens: number): void {
  try {
    const stats: CacheStats = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const k = `${provider}:${task}`;
    const e = stats[k] || { calls: 0, hits: 0, saved: 0 };
    e.calls++;
    if (hitTokens > 0) { e.hits++; e.saved += hitTokens; }
    stats[k] = e;
    localStorage.setItem(CACHE_KEY, JSON.stringify(stats));
  } catch { /* non-critical */ }
}

export function getCacheStats(): CacheStats {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

export function clearCacheStats(): void { localStorage.removeItem(CACHE_KEY); }

// Fallback to env if not provided in settings
const getGeminiKey = (config: ModelConfig) => config.apiKey || (process.env as any).GEMINI_API_KEY || "";

export async function generateText(prompt: string, config: ModelConfig, responseSchema?: any, opts: { task?: string } = {}) {
  const task = opts.task || 'general';
  const fullPrompt = `${MASTER_SYSTEM_PROMPT}\n\n${prompt}`;

  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    const model = genAI.models.generateContent({
      model: config.modelId,
      contents: fullPrompt,
      config: responseSchema ? {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      } : undefined
    });
    const response = await model;
    _updateCache('gemini', task, 0);
    return response.text;
  }

  if (config.provider === 'openrouter') {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: "system", content: MASTER_SYSTEM_PROMPT },
          { role: "user",   content: prompt }
        ],
        response_format: responseSchema ? { type: "json_object" } : undefined
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content;
    _updateCache('openrouter', task, data.usage?.prompt_tokens_details?.cached_tokens ?? 0);
    return text;
  }

  // ─── ANTHROPIC ──────────────────────────────────────────────────────────────
  if (config.provider === 'anthropic') {
    if (!config.apiKey) throw new Error('Anthropic API key not set — go to AI Settings');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: config.modelId,
        max_tokens: 4096,
        system: [{
          type: 'text',
          text: MASTER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as any;
      throw new Error(`Anthropic: ${e?.error?.message || res.statusText}`);
    }
    const data = await res.json() as any;
    const hitTokens = data.usage?.cache_read_input_tokens ?? 0;
    _updateCache('anthropic', task, hitTokens);
    return data.content?.[0]?.text?.trim() ?? '';
  }

  // ─── OPENAI ─────────────────────────────────────────────────────────────────
  if (config.provider === 'openai') {
    if (!config.apiKey) throw new Error('OpenAI API key not set — go to AI Settings');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 4096,
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as any;
      throw new Error(`OpenAI: ${e?.error?.message || res.statusText}`);
    }
    const data = await res.json() as any;
    const cached = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    _updateCache('openai', task, cached);
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  // ─── MISTRAL ─────────────────────────────────────────────────────────────────
  if (config.provider === 'mistral') {
    if (!config.apiKey) throw new Error('Mistral API key not set — go to AI Settings');
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 4096,
      }),
    });
    if (!res.ok) throw new Error(`Mistral: ${res.statusText}`);
    const data = await res.json() as any;
    _updateCache('mistral', task, 0);
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  // ─── DEEPSEEK ─────────────────────────────────────────────────────────────────
  if (config.provider === 'deepseek') {
    if (!config.apiKey) throw new Error('DeepSeek API key not set — go to AI Settings');
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 4096,
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek: ${res.statusText}`);
    const data = await res.json() as any;
    _updateCache('deepseek', task, 0);
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  if (config.provider === 'ollama') {
    const baseUrl = config.baseUrl || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.modelId,
        prompt: prompt,
        stream: false,
        format: responseSchema ? "json" : undefined
      })
    });
    const data = await response.json();
    return data.response;
  }

  if (config.provider === 'huggingface') {
    const response = await fetch(`https://api-inference.huggingface.co/models/${config.modelId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });
    const data = await response.json();
    // HF response format varies by model type, this is a simplified version
    return Array.isArray(data) ? data[0].generated_text : data.generated_text;
  }

  throw new Error(`Unsupported provider: ${config.provider}`);
}

// Specialized functions adapted to use settings
export async function analyzeNiche(nicheName: string, settings: AISettings) {
  const prompt = `Analyze the YouTube niche: "${nicheName}". 
    Identify:
    1. Highest earning channel types in this niche.
    2. Common weaknesses in current content (e.g., boring intros, poor SEO, low-quality visuals).
    3. How AI can be used to improve these weaknesses.
    4. A potential "spawned" sub-niche or unique style that could work well.
    
    Format the response as a clear Markdown report.`;
  return generateText(prompt, settings.analysisModel, undefined, { task: 'niche_analysis' });
}

export async function generateImprovedContent(originalTitle: string, originalDescription: string, niche: string, settings: AISettings) {
  const prompt = `I want to clone and improve a YouTube video from the "${niche}" niche. 
    If this is children's content or animated content, ensure the script and prompts reflect that style.
    Original Title: "${originalTitle}"
    Original Description: "${originalDescription}"
    
    Please generate:
    1. An improved, high-click-through-rate (CTR) title.
    2. A more engaging, SEO-optimized description.
    3. A consistent **Visual Style Guide** (e.g., "3D Pixar-style animation", "Gritty cinematic realism", "Bright educational 2D art").
    4. A sequence of **Scenes**. Each scene must have:
       - A part of the script (narrated text).
       - A detailed visual generation prompt that follows the Visual Style Guide.
    
    5. **Market Gap & Niche Pivot Analysis**:
       - Identify 2-3 "Market Gaps" where this style of content is currently missing or low-quality.
       - Suggest 2 specific "Niche Pivots".
       
    IMPORTANT: Respond ONLY with a valid JSON object.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      improvedTitle: { type: Type.STRING },
      improvedDescription: { type: Type.STRING },
      visualStyle: { type: Type.STRING },
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            scriptPart: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          },
          required: ["scriptPart", "visualPrompt"]
        }
      },
      marketGapAnalysis: { type: Type.STRING },
      nichePivots: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pivotName: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["pivotName", "explanation"]
        }
      }
    },
    required: ["improvedTitle", "improvedDescription", "visualStyle", "scenes", "marketGapAnalysis", "nichePivots"]
  };

  const text = await generateText(prompt, settings.cloningModel, schema, { task: 'content_cloning' });
  try {
    return JSON.parse(text || "{}");
  } catch (e) {
    // Fallback if model didn't return clean JSON
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  }
}

export async function discoverHighPotentialNiches(settings: AISettings) {
  const prompt = `Discover 6 high-potential YouTube niches that are ideal for AI-driven content cloning and improvement.
    Focus on:
    - Popularity (High search volume)
    - Earnings (High CPM or sponsorship potential)
    - Cloning Potential (Easy to replicate and improve using AI tools)
    - Success Probability (Likelihood of a new channel succeeding with improved quality)
    - Saturation (How crowded the niche is, 1-100, where 100 is extremely saturated)
    - difficulty: "Easy", "Medium", or "Hard".
    - ai_tools: A list of 3 key AI tools to use.
    - improvement_angle: How we can specifically improve existing content in this niche.
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        popularity: { type: Type.NUMBER },
        earnings: { type: Type.STRING },
        cloning_potential: { type: Type.NUMBER },
        success_probability: { type: Type.NUMBER },
        saturation_level: { type: Type.NUMBER },
        difficulty: { type: Type.STRING },
        ai_tools: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvement_angle: { type: Type.STRING }
      },
      required: ["name", "description", "popularity", "earnings", "cloning_potential", "success_probability", "saturation_level", "difficulty", "ai_tools", "improvement_angle"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'niche_discovery' });
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

export async function generateImprovedContentProposals(channelName: string, niche: string, settings: AISettings) {
  const prompt = `Analyze the YouTube channel "${channelName}" in the "${niche}" niche.
    
    Identify 3 specific videos or content pieces from this channel that have high potential but could be significantly improved.
    For each, propose a "2.0 Version" that is more click-worthy, has better SEO, or fills a content gap.

    For each proposal, provide:
    - originalTitle: The title of the content being improved.
    - improvementType: One of "Title Pivot", "Format Shift", "Deep Dive", or "Contrarian Take".
    - improvedTitle: The new, high-CTR title.
    - improvedConcept: A brief explanation of how the content itself would change (e.g., "Add better visualization", "Cut the fluff", "Focus on a specific case study").
    - reason: Why this improvement would work better.
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        originalTitle: { type: Type.STRING },
        improvementType: { type: Type.STRING },
        improvedTitle: { type: Type.STRING },
        improvedConcept: { type: Type.STRING },
        reason: { type: Type.STRING }
      },
      required: ["originalTitle", "improvementType", "improvedTitle", "improvedConcept", "reason"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'improvement_proposals' });
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

export async function analyzeChannel(channelName: string, niche: string, settings: AISettings) {
  const prompt = `Analyze the YouTube channel "${channelName}" in the "${niche}" niche.
    
    Please provide:
    1. Overall channel improvement strategy (what they are missing).
    2. A list of 5 high-potential videos to "clone and improve". 
    
    For each video, provide:
    - originalTitle: The title of the video.
    - views: A hypothetical high view count (e.g., "1.2M").
    - easeOfCreation: A score from 1-100.
    - improvementAngle: How we can make it better.
    - improvedTitle: A suggested high-CTR title.
    - improvedDescription: A suggested SEO description.
    
    IMPORTANT: Respond ONLY with a valid JSON object.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      strategy: { type: Type.STRING },
      videos: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            originalTitle: { type: Type.STRING },
            views: { type: Type.STRING },
            easeOfCreation: { type: Type.NUMBER },
            improvementAngle: { type: Type.STRING },
            improvedTitle: { type: Type.STRING },
            improvedDescription: { type: Type.STRING }
          },
          required: ["originalTitle", "views", "easeOfCreation", "improvementAngle", "improvedTitle", "improvedDescription"]
        }
      }
    },
    required: ["strategy", "videos"]
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'channel_analysis' });
  try {
    return JSON.parse(text || "{}");
  } catch (e) {
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  }
}

export async function identifyTrendingCandidates(niche: string, settings: AISettings) {
  const prompt = `Identify 3 hypothetical high-potential "candidate" channel types in the "${niche}" niche that are currently trending but could be improved with better AI-driven production. 
    For each, provide:
    - A name for the channel type.
    - Why it's high-earning.
    - The specific "improvement gap" (what they are doing wrong).
    - How our AI cloner can fill that gap.
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        reason: { type: Type.STRING },
        gap: { type: Type.STRING },
        solution: { type: Type.STRING }
      },
      required: ["name", "reason", "gap", "solution"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'trend_analysis' });
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

// ... existing imports

export async function analyzeNicheLeaders(niche: string, settings: AISettings, realChannels: any[] = []) {
  const channelContext = realChannels.length > 0 
    ? `Here are some real channels found in this niche: ${JSON.stringify(realChannels.map(c => ({ title: c.snippet.channelTitle, desc: c.snippet.description })))}. Analyze these and others you know.`
    : `Identify top performing channels in this niche based on your knowledge.`;

  const prompt = `Analyze the top performing channels in the "${niche}" niche. ${channelContext}
    
    Identify 4-6 market leaders that have high views, high earnings, and high potential for "cloning and improving".
    
    For each channel, provide:
    - Name
    - Estimated Subscriber Count (e.g. "2.5M")
    - Average Views per Video (e.g. "500K")
    - Estimated Monthly Revenue (e.g. "$20k - $50k")
    - Clone Potential Score (1-100)
    - Why it's a good target (e.g. "Great topics but bad editing", "High demand but inconsistent uploads")
    - 3 Specific "Top Content" pieces from them that we should clone/improve.
    
    For each Top Content piece, include:
    - The original title.
    - An "improvement_angle" (e.g. "Better visualization", "More concise").
    - A "suggested_improved_title" (e.g. "The SAME topic but clickbait-optimized").
    - A "suggested_improvement" (e.g. "Use 3D animation instead of stock footage").
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        subscriberCount: { type: Type.STRING },
        avgViews: { type: Type.STRING },
        estimatedMonthlyRevenue: { type: Type.STRING },
        clonePotential: { type: Type.NUMBER },
        whyClone: { type: Type.STRING },
        topContentToClone: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              improvementAngle: { type: Type.STRING },
              suggestedImprovedTitle: { type: Type.STRING },
              suggestedImprovement: { type: Type.STRING }
            },
            required: ["title", "improvementAngle", "suggestedImprovedTitle", "suggestedImprovement"]
          }
        }
      },
      required: ["name", "subscriberCount", "avgViews", "estimatedMonthlyRevenue", "clonePotential", "whyClone", "topContentToClone"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema);
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

export async function generateContentGapIdeas(niche: string, settings: AISettings) {
  const prompt = `Generate 5 high-potential "Blue Ocean" content ideas for the "${niche}" niche.
    These should be ideas that fill a gap in the current market - content that audiences want but isn't being served well by current creators.
    
    For each idea, provide:
    - Title
    - Content Type (e.g. "Documentary", "Tutorial", "Challenge")
    - The Gap It Fills
    - Why it will go viral
    - Estimated Views
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        contentType: { type: Type.STRING },
        gapFilled: { type: Type.STRING },
        viralReason: { type: Type.STRING },
        estimatedViews: { type: Type.STRING }
      },
      required: ["title", "contentType", "gapFilled", "viralReason", "estimatedViews"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema);
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

export async function generateMusicPrompts(channelName: string, niche: string, settings: AISettings) {
  const prompt = `Analyze the music style of the YouTube channel "${channelName}" in the "${niche}" niche.
    Based on their content, generate 3 detailed prompts that can be used in external AI music creation apps (like Suno, Udio, or Stable Audio).
    
    Each prompt should include:
    - Genre/Style (e.g., "Lo-Fi Hip Hop", "Ambient Synthwave")
    - Mood (e.g., "Chill", "Melancholic", "Productive")
    - Instruments (e.g., "Rhodes piano", "Vinyl crackle", "Subdued bass")
    - BPM and Key suggestions.
    - A "Master Prompt" string for copy-pasting.
    
    IMPORTANT: Respond ONLY with a valid JSON array of objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        styleName: { type: Type.STRING },
        mood: { type: Type.STRING },
        instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
        bpm: { type: Type.STRING },
        masterPrompt: { type: Type.STRING }
      },
      required: ["styleName", "mood", "instruments", "bpm", "masterPrompt"]
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'music_prompts' });
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

// Video and Audio still mostly Gemini-focused as they are specialized, 
// but we can add placeholders or simple implementations for others if they have APIs.
export async function generateVideoClip(prompt: string, settings: AISettings, options: { resolution?: string, aspectRatio?: string } = {}) {
  const config = settings.videoModel;
  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    return genAI.models.generateVideos({
      model: config.modelId,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: options.resolution || '720p',
        aspectRatio: options.aspectRatio || '16:9'
      }
    });
  }
  // Placeholder for other video providers
  throw new Error(`Video generation not yet implemented for ${config.provider}`);
}

export async function pollVideoOperation(operationId: string, settings: AISettings) {
  const config = settings.videoModel;
  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    // @ts-ignore
    return genAI.operations.getVideosOperation({ operation: { name: operationId } });
  }
  throw new Error(`Polling not implemented for ${config.provider}`);
}

export async function generateVoiceover(text: string, settings: AISettings, voiceName: string = 'Kore', speed: number = 1.0) {
  const config = settings.audioModel;
  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    const response = await genAI.models.generateContent({
      model: config.modelId,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
          // @ts-ignore - speakingRate might be missing in types but present in API
          speakingRate: speed,
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
  throw new Error(`Audio generation not yet implemented for ${config.provider}`);
}

export interface WanScenePrompt {
  sceneNumber: number;
  scriptExcerpt: string;
  wanPrompt: string;
  negativePrompt: string;
  shotType: string;
  durationSeconds: number;
  subject: string;
  environment: string;
  lighting: string;
  atmosphere: string;
  cameraMotion: string;
}

export interface WanPromptOptions {
  shotType?: string;
  subject?: string;
  environment?: string;
  lighting?: string;
  atmosphere?: string;
  cameraMotion?: string;
  duration?: string;
}

export async function generateWanPrompts(
  scenes: Array<{ scriptPart: string; visualPrompt: string }>,
  visualStyle: string,
  settings: AISettings,
  options: WanPromptOptions = {}
): Promise<WanScenePrompt[]> {
  const sceneText = scenes.map((s, i) =>
    `Scene ${i + 1}: "${s.scriptPart.slice(0, 120)}" | Visual: ${s.visualPrompt.slice(0, 80)}`
  ).join('\n');

  const optionsContext = Object.entries(options)
    .filter(([_, v]) => v && v !== 'Auto')
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join('\n');

  const defaultDuration = parseInt(options.duration || '5', 10);

  const prompt = `Convert these video scenes into Wan 2.1-compatible video generation prompts.
Visual style for this video: ${visualStyle}

GLOBAL PREFERENCES (Apply these unless scene dictates otherwise):
${optionsContext}
Target Duration Per Scene: ${defaultDuration} seconds (unless scene content requires more time, but prefer ${defaultDuration}s)

SCENES:
${sceneText}

For each scene generate a Wan prompt following this exact structure:
"[SHOT TYPE] [SUBJECT] in [ENVIRONMENT], [LIGHTING], [ATMOSPHERE], [CAMERA MOTION], ${visualStyle}, photorealistic 4K, [DURATION] seconds"

Ensure the [DURATION] in the prompt matches the durationSeconds field.

Negative prompt for all scenes (use exactly):
"blurry, distorted faces, watermark, text overlay, bad anatomy, flickering, low quality, duplicate frames, static, jpeg artifacts"

IMPORTANT: Respond ONLY with a valid JSON array.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        sceneNumber:     { type: Type.NUMBER },
        scriptExcerpt:   { type: Type.STRING },
        wanPrompt:       { type: Type.STRING },
        negativePrompt:  { type: Type.STRING },
        shotType:        { type: Type.STRING },
        durationSeconds: { type: Type.NUMBER },
        subject:         { type: Type.STRING },
        environment:     { type: Type.STRING },
        lighting:        { type: Type.STRING },
        atmosphere:      { type: Type.STRING },
        cameraMotion:    { type: Type.STRING },
      },
      required: ['sceneNumber', 'scriptExcerpt', 'wanPrompt', 'negativePrompt', 'shotType', 'durationSeconds', 'subject', 'environment', 'lighting', 'atmosphere', 'cameraMotion']
    }
  };

  const text = await generateText(prompt, settings.analysisModel, schema, { task: 'wan_prompts' });
  try {
    const parsed = JSON.parse(text || '[]');
    return parsed.map((s: any) => ({
      ...s,
      negativePrompt: 'blurry, distorted faces, watermark, text overlay, bad anatomy, flickering, low quality, duplicate frames, static, jpeg artifacts',
    }));
  } catch {
    return [];
  }
}
