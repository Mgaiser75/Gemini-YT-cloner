
export interface ModelCost {
  id: string;
  provider: string;
  costPer1MTokens?: number; // USD
  costPerGeneration?: number; // USD
  unit: 'tokens' | 'generation' | 'free';
  tier: 'Free' | 'Budget' | 'Standard' | 'Premium';
}

export const MODEL_COSTS: Record<string, ModelCost> = {
  'gemini-3.1-pro-preview': {
    id: 'gemini-3.1-pro-preview',
    provider: 'gemini',
    costPer1MTokens: 3.50,
    unit: 'tokens',
    tier: 'Standard'
  },
  'gemini-3-flash-preview': {
    id: 'gemini-3-flash-preview',
    provider: 'gemini',
    costPer1MTokens: 0.10,
    unit: 'tokens',
    tier: 'Budget'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    costPer1MTokens: 0.10,
    unit: 'tokens',
    tier: 'Budget'
  },
  'veo-3.1-fast-generate-preview': {
    id: 'veo-3.1-fast-generate-preview',
    provider: 'gemini',
    costPerGeneration: 0.50,
    unit: 'generation',
    tier: 'Premium'
  },
  'gemini-2.5-flash-preview-tts': {
    id: 'gemini-2.5-flash-preview-tts',
    provider: 'gemini',
    costPer1MTokens: 0.10,
    unit: 'tokens',
    tier: 'Budget'
  },
  'mistralai/mistral-7b-instruct': {
    id: 'mistralai/mistral-7b-instruct',
    provider: 'openrouter',
    costPer1MTokens: 0.05,
    unit: 'tokens',
    tier: 'Budget'
  },
  'anthropic/claude-3-opus': {
    id: 'anthropic/claude-3-opus',
    provider: 'openrouter',
    costPer1MTokens: 15.00,
    unit: 'tokens',
    tier: 'Premium'
  },
  'llama3': {
    id: 'llama3',
    provider: 'ollama',
    unit: 'free',
    tier: 'Free'
  },
  'mistral': {
    id: 'mistral',
    provider: 'ollama',
    unit: 'free',
    tier: 'Free'
  },
  'qwen': {
    id: 'qwen',
    provider: 'ollama',
    unit: 'free',
    tier: 'Free'
  }
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
