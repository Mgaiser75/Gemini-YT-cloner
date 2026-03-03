
export type AIProvider = 'gemini' | 'openrouter' | 'huggingface' | 'ollama';

export interface ModelConfig {
  provider: AIProvider;
  modelId: string;
  apiKey?: string;
  baseUrl?: string; // For Ollama or custom endpoints
}

export interface AISettings {
  analysisModel: ModelConfig;
  cloningModel: ModelConfig;
  videoModel: ModelConfig;
  audioModel: ModelConfig;
}

export const DEFAULT_SETTINGS: AISettings = {
  analysisModel: {
    provider: 'gemini',
    modelId: 'gemini-3.1-pro-preview',
  },
  cloningModel: {
    provider: 'gemini',
    modelId: 'gemini-3.1-pro-preview',
  },
  videoModel: {
    provider: 'gemini',
    modelId: 'veo-3.1-fast-generate-preview',
  },
  audioModel: {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash-preview-tts',
  },
};

export const PROVIDER_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast (Video)' },
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS (Audio)' },
  ],
  openrouter: [
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (via OpenRouter)' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'qwen/qwen-72b-chat', name: 'Qwen 72B' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  ],
  huggingface: [
    { id: 'mistralai/Mistral-7B-v0.1', name: 'Mistral 7B (HF)' },
    { id: 'meta-llama/Llama-2-7b-hf', name: 'Llama 2 7B (HF)' },
  ],
  ollama: [
    { id: 'llama3', name: 'Llama 3 (Local)' },
    { id: 'mistral', name: 'Mistral (Local)' },
    { id: 'qwen', name: 'Qwen (Local)' },
  ],
};
