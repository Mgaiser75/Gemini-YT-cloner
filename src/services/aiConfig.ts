
export type AIProvider = 'gemini' | 'openrouter' | 'huggingface' | 'ollama' | 'openai' | 'anthropic' | 'mistral' | 'deepseek';

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
  youtubeApiKey?: string;
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
  youtubeApiKey: "",
};

export interface ModelOption {
  id: string;
  name: string;
  capabilities: ('text' | 'image' | 'video' | 'audio')[];
}

export const PROVIDER_MODELS: Record<AIProvider, ModelOption[]> = {
  gemini: [
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', capabilities: ['text'] },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', capabilities: ['text'] },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', capabilities: ['text'] },
    { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', capabilities: ['image'] },
    { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', capabilities: ['video'] },
    { id: 'veo-3.1-generate-preview', name: 'Veo 3.1 High Quality', capabilities: ['video'] },
    { id: 'gemini-2.5-flash-preview-tts', name: 'Gemini 2.5 Flash TTS', capabilities: ['audio'] },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', capabilities: ['text', 'image'] },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', capabilities: ['text'] },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', capabilities: ['text'] },
    { id: 'dall-e-3', name: 'DALL-E 3', capabilities: ['image'] },
    { id: 'tts-1', name: 'TTS-1', capabilities: ['audio'] },
    { id: 'tts-1-hd', name: 'TTS-1 HD', capabilities: ['audio'] },
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', capabilities: ['text'] },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', capabilities: ['text'] },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', capabilities: ['text'] },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', capabilities: ['text'] },
    { id: 'mistral-medium-latest', name: 'Mistral Medium', capabilities: ['text'] },
    { id: 'mistral-small-latest', name: 'Mistral Small', capabilities: ['text'] },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', capabilities: ['text'] },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', capabilities: ['text'] },
  ],
  openrouter: [
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', capabilities: ['text'] },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', capabilities: ['text'] },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', capabilities: ['text'] },
    { id: 'qwen/qwen-72b-chat', name: 'Qwen 72B', capabilities: ['text'] },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', capabilities: ['text'] },
    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', capabilities: ['text'] },
  ],
  huggingface: [
    { id: 'mistralai/Mistral-7B-v0.1', name: 'Mistral 7B', capabilities: ['text'] },
    { id: 'meta-llama/Llama-2-7b-hf', name: 'Llama 2 7B', capabilities: ['text'] },
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', capabilities: ['image'] },
  ],
  ollama: [
    { id: 'llama3', name: 'Llama 3', capabilities: ['text'] },
    { id: 'mistral', name: 'Mistral', capabilities: ['text'] },
    { id: 'qwen', name: 'Qwen', capabilities: ['text'] },
    { id: 'gemma', name: 'Gemma', capabilities: ['text'] },
    { id: 'llava', name: 'LLaVA', capabilities: ['text', 'image'] },
  ],
};
