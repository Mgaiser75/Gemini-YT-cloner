
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AISettings, ModelConfig } from "./aiConfig";

// Fallback to env if not provided in settings
const getGeminiKey = (config: ModelConfig) => config.apiKey || (process.env as any).GEMINI_API_KEY || "";

export async function generateText(prompt: string, config: ModelConfig, responseSchema?: any) {
  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    const model = genAI.models.generateContent({
      model: config.modelId,
      contents: prompt,
      config: responseSchema ? {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      } : undefined
    });
    const response = await model;
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
        messages: [{ role: "user", content: prompt }],
        response_format: responseSchema ? { type: "json_object" } : undefined
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
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
  return generateText(prompt, settings.analysisModel);
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

  const text = await generateText(prompt, settings.cloningModel, schema);
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

  const text = await generateText(prompt, settings.analysisModel, schema);
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

  const text = await generateText(prompt, settings.analysisModel, schema);
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

  const text = await generateText(prompt, settings.analysisModel, schema);
  try {
    return JSON.parse(text || "[]");
  } catch (e) {
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
  }
}

// Video and Audio still mostly Gemini-focused as they are specialized, 
// but we can add placeholders or simple implementations for others if they have APIs.
export async function generateVideoClip(prompt: string, settings: AISettings) {
  const config = settings.videoModel;
  if (config.provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey: getGeminiKey(config) });
    return genAI.models.generateVideos({
      model: config.modelId,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
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

export async function generateVoiceover(text: string, settings: AISettings, voiceName: string = 'Kore') {
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
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
  throw new Error(`Audio generation not yet implemented for ${config.provider}`);
}
