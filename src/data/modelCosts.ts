
export interface ModelCost {
  id: string;
  provider: string;
  costPer1MTokens?: number; // USD
  costPerGeneration?: number; // USD
  unit: 'tokens' | 'generation' | 'free';
  tier: 'Free' | 'Budget' | 'Standard' | 'Premium';
}

export const MODEL_COSTS: Record<string, ModelCost> = {
  // Gemini Models
  'gemini-3.1-pro-preview': { id: 'gemini-3.1-pro-preview', provider: 'gemini', costPer1MTokens: 3.50, unit: 'tokens', tier: 'Standard' },
  'gemini-3-flash-preview': { id: 'gemini-3-flash-preview', provider: 'gemini', costPer1MTokens: 0.10, unit: 'tokens', tier: 'Budget' },
  'gemini-2.5-flash': { id: 'gemini-2.5-flash', provider: 'gemini', costPer1MTokens: 0.10, unit: 'tokens', tier: 'Budget' },
  'gemini-3.1-flash-image-preview': { id: 'gemini-3.1-flash-image-preview', provider: 'gemini', costPerGeneration: 0.04, unit: 'generation', tier: 'Standard' },
  'veo-3.1-fast-generate-preview': { id: 'veo-3.1-fast-generate-preview', provider: 'gemini', costPerGeneration: 0.50, unit: 'generation', tier: 'Premium' },
  'veo-3.1-generate-preview': { id: 'veo-3.1-generate-preview', provider: 'gemini', costPerGeneration: 1.50, unit: 'generation', tier: 'Premium' },
  'gemini-2.5-flash-preview-tts': { id: 'gemini-2.5-flash-preview-tts', provider: 'gemini', costPer1MTokens: 0.10, unit: 'tokens', tier: 'Budget' },

  // OpenAI Models
  'gpt-4o': { id: 'gpt-4o', provider: 'openai', costPer1MTokens: 5.00, unit: 'tokens', tier: 'Premium' },
  'gpt-4-turbo': { id: 'gpt-4-turbo', provider: 'openai', costPer1MTokens: 10.00, unit: 'tokens', tier: 'Premium' },
  'gpt-3.5-turbo': { id: 'gpt-3.5-turbo', provider: 'openai', costPer1MTokens: 0.50, unit: 'tokens', tier: 'Budget' },
  'dall-e-3': { id: 'dall-e-3', provider: 'openai', costPerGeneration: 0.04, unit: 'generation', tier: 'Standard' },
  'tts-1': { id: 'tts-1', provider: 'openai', costPer1MTokens: 15.00, unit: 'tokens', tier: 'Standard' },
  'tts-1-hd': { id: 'tts-1-hd', provider: 'openai', costPer1MTokens: 30.00, unit: 'tokens', tier: 'Premium' },

  // Anthropic Models
  'claude-3-opus-20240229': { id: 'claude-3-opus-20240229', provider: 'anthropic', costPer1MTokens: 15.00, unit: 'tokens', tier: 'Premium' },
  'claude-3-sonnet-20240229': { id: 'claude-3-sonnet-20240229', provider: 'anthropic', costPer1MTokens: 3.00, unit: 'tokens', tier: 'Standard' },
  'claude-3-haiku-20240307': { id: 'claude-3-haiku-20240307', provider: 'anthropic', costPer1MTokens: 0.25, unit: 'tokens', tier: 'Budget' },

  // Mistral Models
  'mistral-large-latest': { id: 'mistral-large-latest', provider: 'mistral', costPer1MTokens: 8.00, unit: 'tokens', tier: 'Premium' },
  'mistral-medium-latest': { id: 'mistral-medium-latest', provider: 'mistral', costPer1MTokens: 2.70, unit: 'tokens', tier: 'Standard' },
  'mistral-small-latest': { id: 'mistral-small-latest', provider: 'mistral', costPer1MTokens: 0.70, unit: 'tokens', tier: 'Budget' },

  // DeepSeek Models
  'deepseek-chat': { id: 'deepseek-chat', provider: 'deepseek', costPer1MTokens: 0.14, unit: 'tokens', tier: 'Budget' },
  'deepseek-coder': { id: 'deepseek-coder', provider: 'deepseek', costPer1MTokens: 0.14, unit: 'tokens', tier: 'Budget' },

  // OpenRouter Models
  'mistralai/mistral-7b-instruct': { id: 'mistralai/mistral-7b-instruct', provider: 'openrouter', costPer1MTokens: 0.05, unit: 'tokens', tier: 'Budget' },
  'google/gemini-pro-1.5': { id: 'google/gemini-pro-1.5', provider: 'openrouter', costPer1MTokens: 3.50, unit: 'tokens', tier: 'Standard' },
  'anthropic/claude-3-opus': { id: 'anthropic/claude-3-opus', provider: 'openrouter', costPer1MTokens: 15.00, unit: 'tokens', tier: 'Premium' },
  'qwen/qwen-72b-chat': { id: 'qwen/qwen-72b-chat', provider: 'openrouter', costPer1MTokens: 0.90, unit: 'tokens', tier: 'Budget' },
  'deepseek/deepseek-chat': { id: 'deepseek/deepseek-chat', provider: 'openrouter', costPer1MTokens: 0.14, unit: 'tokens', tier: 'Budget' },
  'meta-llama/llama-3-70b-instruct': { id: 'meta-llama/llama-3-70b-instruct', provider: 'openrouter', costPer1MTokens: 0.70, unit: 'tokens', tier: 'Budget' },

  // Hugging Face Models (Assuming Inference API free tier or low cost)
  'mistralai/Mistral-7B-v0.1': { id: 'mistralai/Mistral-7B-v0.1', provider: 'huggingface', unit: 'free', tier: 'Free' },
  'meta-llama/Llama-2-7b-hf': { id: 'meta-llama/Llama-2-7b-hf', provider: 'huggingface', unit: 'free', tier: 'Free' },
  'stabilityai/stable-diffusion-xl-base-1.0': { id: 'stabilityai/stable-diffusion-xl-base-1.0', provider: 'huggingface', unit: 'free', tier: 'Free' },

  // Ollama Models (Local)
  'llama3': { id: 'llama3', provider: 'ollama', unit: 'free', tier: 'Free' },
  'mistral': { id: 'mistral', provider: 'ollama', unit: 'free', tier: 'Free' },
  'qwen': { id: 'qwen', provider: 'ollama', unit: 'free', tier: 'Free' },
  'gemma': { id: 'gemma', provider: 'ollama', unit: 'free', tier: 'Free' },
  'llava': { id: 'llava', provider: 'ollama', unit: 'free', tier: 'Free' },
  // Updated Anthropic Models
  'claude-opus-4-6':           { id: 'claude-opus-4-6',           provider: 'anthropic', costPer1MTokens: 75.00, unit: 'tokens', tier: 'Premium' },
  'claude-sonnet-4-6':         { id: 'claude-sonnet-4-6',         provider: 'anthropic', costPer1MTokens: 15.00, unit: 'tokens', tier: 'Standard' },
  'claude-haiku-4-5-20251001': { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', costPer1MTokens: 2.50,  unit: 'tokens', tier: 'Budget' },

  // Updated OpenAI Models
  'gpt-4.1':      { id: 'gpt-4.1',      provider: 'openai', costPer1MTokens: 5.00,  unit: 'tokens', tier: 'Standard' },
  'gpt-4.1-mini': { id: 'gpt-4.1-mini', provider: 'openai', costPer1MTokens: 0.30,  unit: 'tokens', tier: 'Budget' },
  'o3-mini':      { id: 'o3-mini',      provider: 'openai', costPer1MTokens: 1.10,  unit: 'tokens', tier: 'Budget' },

  // Updated Mistral Models
  'mistral-large-2411': { id: 'mistral-large-2411', provider: 'mistral', costPer1MTokens: 4.00, unit: 'tokens', tier: 'Standard' },
  'mistral-small-2409': { id: 'mistral-small-2409', provider: 'mistral', costPer1MTokens: 0.60, unit: 'tokens', tier: 'Budget' },

  // Updated DeepSeek
  'deepseek-reasoner': { id: 'deepseek-reasoner', provider: 'deepseek', costPer1MTokens: 1.10, unit: 'tokens', tier: 'Budget' },

  // Updated Gemini
  'gemini-2.5-pro': { id: 'gemini-2.5-pro', provider: 'gemini', costPer1MTokens: 3.00, unit: 'tokens', tier: 'Standard' },
};

export function getModelCostDisplay(modelId: string, task?: 'analysis' | 'cloning' | 'video' | 'audio'): string {
  const cost = MODEL_COSTS[modelId];
  if (!cost) return "Unknown Cost";
  
  if (cost.unit === 'free') return "Free (Local)";
  if (cost.unit === 'generation') return `$${cost.costPerGeneration?.toFixed(2)} / gen`;
  
  if (cost.costPer1MTokens !== undefined) {
    const perMillion = cost.costPer1MTokens;
    
    // Task-oriented estimates
    if (task === 'analysis') {
      const estTokens = 4000; // Input + Output for deep analysis
      const estCost = (perMillion / 1000000) * estTokens;
      return `Est. $${estCost.toFixed(3)} / analysis`;
    }
    
    if (task === 'cloning') {
      const estTokens = 2000; // Input + Output for content generation
      const estCost = (perMillion / 1000000) * estTokens;
      return `Est. $${estCost.toFixed(3)} / generation`;
    }

    if (task === 'audio') {
      const estTokens = 500; // Average script length
      const estCost = (perMillion / 1000000) * estTokens;
      return `Est. $${estCost.toFixed(4)} / script`;
    }

    if (perMillion < 1) return `< $1.00 / 1M tokens`;
    return `$${perMillion.toFixed(2)} / 1M tokens`;
  }
  return "Variable Cost";
}
