
import React from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { AISettings, PROVIDER_MODELS, AIProvider } from "../services/aiConfig";
import { getModelCostDisplay } from "../data/modelCosts";
import { cn } from "../utils/cn";

interface QuickModelSelectorProps {
  type: keyof AISettings;
  settings: AISettings;
  onUpdate: (settings: AISettings) => void;
  className?: string;
}

export function QuickModelSelector({ type, settings, onUpdate, className }: QuickModelSelectorProps) {
  const config = settings[type];
  
  // Map settings type to task for cost display
  const taskMap: Record<string, 'analysis' | 'cloning' | 'video' | 'audio'> = {
    analysisModel: 'analysis',
    cloningModel: 'cloning',
    videoModel: 'video',
    audioModel: 'audio'
  };

  const task = taskMap[type];
  
  const handleModelChange = (modelId: string) => {
    const newSettings = {
      ...settings,
      [type]: {
        ...settings[type],
        modelId
      }
    };
    onUpdate(newSettings);
  };

  const handleProviderChange = (provider: AIProvider) => {
    const newSettings = {
      ...settings,
      [type]: {
        ...settings[type],
        provider,
        modelId: PROVIDER_MODELS[provider][0].id
      }
    };
    onUpdate(newSettings);
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
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
            <option value="huggingface">HF</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white border border-[#141414] px-2 py-1 shadow-[2px_2px_0px_0px_#141414]">
          <select 
            value={config.modelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer max-w-[120px] truncate"
          >
            {PROVIDER_MODELS[config.provider].map(m => (
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
