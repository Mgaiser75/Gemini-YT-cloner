
import React, { useState } from "react";
import { Settings, Save, Globe, Cpu, Key, Database, Info, MonitorPlay } from "lucide-react";
import { AISettings, PROVIDER_MODELS, AIProvider, ModelConfig } from "../services/aiConfig";
import { getModelCostDisplay } from "../data/modelCosts";
import { motion } from "motion/react";

interface ModelManagerProps {
  settings: AISettings;
  onSave: (settings: AISettings) => void;
  onClose: () => void;
}

export function ModelManager({ settings, onSave, onClose }: ModelManagerProps) {
  const [tempSettings, setTempSettings] = useState<AISettings>(settings);

  const handleUpdateModel = (type: keyof AISettings, field: keyof ModelConfig, value: any) => {
    setTempSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
        // Reset modelId if provider changes
        ...(field === 'provider' ? { modelId: PROVIDER_MODELS[value as AIProvider][0].id } : {})
      }
    }));
  };

  const ModelSection = ({ title, type, icon }: { title: string, type: keyof AISettings, icon: React.ReactNode }) => {
    const config = tempSettings[type];
    
    return (
      <div className="bg-white border border-[#141414] p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.05)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-[#141414] text-[#E4E3E0] rounded-sm">
            {icon}
          </div>
          <h3 className="text-lg font-bold italic font-serif">{title}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Provider</label>
            <select 
              value={config.provider}
              onChange={(e) => handleUpdateModel(type, 'provider', e.target.value)}
              className="w-full bg-[#E4E3E0]/20 border border-[#141414]/10 p-2 text-sm font-bold focus:ring-0 focus:border-[#141414]"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter (Mistral, Qwen, etc.)</option>
              <option value="huggingface">Hugging Face</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Model</label>
            <div className="relative">
              <select 
                value={config.modelId}
                onChange={(e) => handleUpdateModel(type, 'modelId', e.target.value)}
                className="w-full bg-[#E4E3E0]/20 border border-[#141414]/10 p-2 text-sm font-bold focus:ring-0 focus:border-[#141414]"
              >
                {PROVIDER_MODELS[config.provider].map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                <option value="custom">Custom ID...</option>
              </select>
            </div>
            <p className="text-[10px] font-mono mt-1 text-[#141414]/60">
              Est. Cost: <span className="font-bold text-[#141414]">{getModelCostDisplay(config.modelId)}</span>
            </p>
          </div>
        </div>

        {config.modelId === 'custom' && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Custom Model ID</label>
            <input 
              type="text"
              placeholder="e.g. mistral-large-latest"
              onChange={(e) => handleUpdateModel(type, 'modelId', e.target.value)}
              className="w-full bg-[#E4E3E0]/20 border border-[#141414]/10 p-2 text-sm font-bold focus:ring-0 focus:border-[#141414]"
            />
          </div>
        )}

        {config.provider !== 'ollama' && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">API Key (Optional if set in .env)</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
              <input 
                type="password"
                value={config.apiKey || ""}
                onChange={(e) => handleUpdateModel(type, 'apiKey', e.target.value)}
                placeholder="Enter API Key"
                className="w-full bg-[#E4E3E0]/20 border border-[#141414]/10 p-2 pl-8 text-sm font-bold focus:ring-0 focus:border-[#141414]"
              />
            </div>
          </div>
        )}

        {config.provider === 'ollama' && (
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Ollama Base URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
              <input 
                type="text"
                value={config.baseUrl || "http://localhost:11434"}
                onChange={(e) => handleUpdateModel(type, 'baseUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#E4E3E0]/20 border border-[#141414]/10 p-2 pl-8 text-sm font-bold focus:ring-0 focus:border-[#141414]"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[200] bg-[#E4E3E0]/95 flex items-center justify-center p-4 md:p-12"
    >
      <div className="max-w-4xl w-full bg-[#E4E3E0] border border-[#141414] shadow-[16px_16px_0px_0px_#141414] flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-[#141414] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-3xl font-bold italic font-serif flex items-center gap-3">
              <Settings className="w-8 h-8" /> AI Model Manager
            </h2>
            <p className="text-xs uppercase tracking-widest font-bold opacity-50 mt-1">Configure your generative engine</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#141414]/5 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Note:</strong> Gemini is the default and most stable provider for this app. 
              Other providers (OpenRouter, HF, Ollama) are supported for text generation, but video and audio generation 
              currently prioritize Gemini's specialized models.
            </p>
          </div>

          <ModelSection title="Analysis & Discovery Model" type="analysisModel" icon={<Database className="w-5 h-5" />} />
          <ModelSection title="Content Generation Model" type="cloningModel" icon={<Globe className="w-5 h-5" />} />
          <ModelSection title="Video Generation Model" type="videoModel" icon={<MonitorPlay className="w-5 h-5" />} />
          <ModelSection title="Audio & Voice Model" type="audioModel" icon={<Cpu className="w-5 h-5" />} />
        </div>

        <div className="p-8 border-t border-[#141414] bg-white flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 border border-[#141414] text-sm font-bold hover:bg-[#141414]/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onSave(tempSettings);
              onClose();
            }}
            className="px-8 py-3 bg-[#141414] text-[#E4E3E0] text-sm font-bold flex items-center gap-2 hover:bg-[#141414]/90 transition-all shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
