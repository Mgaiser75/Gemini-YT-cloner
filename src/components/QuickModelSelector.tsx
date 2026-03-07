
import React from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { AISettings, PROVIDER_MODELS, AIProvider, ModelConfig, PROVIDER_DISPLAY_NAMES } from "../services/aiConfig";
import { getModelCostDisplay } from "../data/modelCosts";
import { cn } from "../utils/cn";

interface QuickModelSelectorProps {
  type: Exclude<keyof AISettings, 'youtubeApiKey'>;
  settings: AISettings;
  onUpdate: (settings: AISettings) => void;
  className?: string;
}

export function QuickModelSelector({ type, settings, onUpdate, className }: QuickModelSelectorProps) {
  const config = settings[type] as ModelConfig;
  
  // Map settings type to task for cost display and capability filtering
  const taskMap: Record<string, { task: 'analysis' | 'cloning' | 'video' | 'audio', capability: 'text' | 'image' | 'video' | 'audio' }> = {
    analysisModel: { task: 'analysis', capability: 'text' },
    cloningModel: { task: 'cloning', capability: 'text' },
    videoModel: { task: 'video', capability: 'video' },
    audioModel: { task: 'audio', capability: 'audio' }
  };

  const { task, capability } = taskMap[type];
  
  // Filter providers that have at least one model with the required capability
  const availableProviders = Object.keys(PROVIDER_MODELS).filter(provider => 
    PROVIDER_MODELS[provider as AIProvider].some(m => m.capabilities.includes(capability))
  ) as AIProvider[];

  // Filter models for the selected provider
  const availableModels = PROVIDER_MODELS[config.provider]?.filter(m => 
    m.capabilities.includes(capability)
  ) || [];

  const handleModelChange = (modelId: string) => {
    const newSettings = {
      ...settings,
      [type]: {
        ...(settings[type] as ModelConfig),
        modelId
      }
    };
    onUpdate(newSettings);
  };

  const handleProviderChange = (provider: AIProvider) => {
    // When switching provider, select the first available model with the required capability
    const firstModel = PROVIDER_MODELS[provider].find(m => m.capabilities.includes(capability));
    
    if (firstModel) {
      const newSettings = {
        ...settings,
        [type]: {
          ...(settings[type] as ModelConfig),
          provider,
          modelId: firstModel.id
        }
      };
      onUpdate(newSettings);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white border border-[#141414] px-2 py-1 shadow-[2px_2px_0px_0px_#141414]">
          <Cpu className="w-3 h-3" />
          <select 
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
            className="bg-transparent text-[10px] font-bold uppercase focus:outline-none cursor-pointer"
          >
            {availableProviders.map(p => (
              <option key={p} value={p}>{PROVIDER_DISPLAY_NAMES[p]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#141414] px-2 py-1 shadow-[2px_2px_0px_0px_#141414]">
          <select 
            value={config.modelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer max-w-[120px] truncate"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </div>
      </div>
      <div className="flex justify-end">
        <span className="text-[9px] font-mono opacity-50">
          {getModelCostDisplay(config.modelId, task)}
        </span>
      </div>
    </div>
  );
}
