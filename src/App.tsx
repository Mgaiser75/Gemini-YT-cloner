import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { 
  BarChart3, 
  Layers, 
  Zap, 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Video,
  LayoutDashboard,
  Youtube,
  ExternalLink,
  Menu,
  X,
  FileArchive,
  Play,
  Volume2,
  Loader2,
  Key,
  MonitorPlay,
  Scissors,
  Copy,
  Mic,
  Pause,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Player } from "@remotion/player";
import { AbsoluteFill, Sequence, Video as RemotionVideo, Audio as RemotionAudio } from "remotion";
import WaveSurfer from "wavesurfer.js";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { AI_NICHES, type Niche, type Project } from "./types";
import { 
  analyzeNiche, 
  generateImprovedContent, 
  identifyTrendingCandidates, 
  discoverHighPotentialNiches, 
  analyzeChannel,
  generateVideoClip,
  pollVideoOperation,
  generateVoiceover,
  generateMusicPrompts,
  generateImprovedContentProposals,
  analyzeNicheLeaders,
  generateContentGapIdeas,
  generateWanPrompts
} from "./services/aiService";
import { ModelManager } from "./components/ModelManager";
import { QuickModelSelector } from "./components/QuickModelSelector";
import { DEFAULT_SETTINGS, AISettings } from "./services/aiConfig";
import { Settings as SettingsIcon } from "lucide-react";

const ESTIMATED_TOKENS = {
  niche_analysis: 4000,
  trending_candidates: 2000,
  channel_analysis: 5000,
  video_cloning: 2500,
  voiceover: 500,
  video_gen: 1000,
  music_prompts: 1000,
  discovery: 3000
};

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.1-pro-preview": { input: 1.25, output: 5.00 },
  "gemini-3.1-flash-lite-preview": { input: 0.075, output: 0.30 },
  "gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "gemini-2.5-flash": { input: 0.10, output: 0.40 },
  "gemini-2.5-flash-image": { input: 0.10, output: 0.40 },
  "veo-3.1-fast-generate-preview": { input: 0.10, output: 0.40 }
};

function CostDisplay({ 
  tokens, 
  model, 
  className = "" 
}: { 
  tokens: number; 
  model: string; 
  className?: string 
}) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gemini-3-flash-preview"];
  // Assume 80% input, 20% output for estimation
  const avgPricePerMillion = (pricing.input * 0.8) + (pricing.output * 0.2);
  const cost = (tokens / 1_000_000) * avgPricePerMillion;
  
  return (
    <div className={cn("flex items-center gap-2 text-[10px] font-mono opacity-60", className)}>
      <Sparkles className="w-3 h-3" />
      <span>Est. {tokens.toLocaleString()} tokens</span>
      <span className="opacity-30">|</span>
      <span>${cost.toFixed(4)}</span>
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "analyzer" | "cloner" | "projects" | "research">("dashboard");
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoveredNiches, setDiscoveredNiches] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [analyzedChannelData, setAnalyzedChannelData] = useState<any | null>(null);
  const [isAnalyzingChannel, setIsAnalyzingChannel] = useState(false);
  const [videoSuiteData, setVideoSuiteData] = useState<any | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [analysisCandidates, setAnalysisCandidates] = useState<any[]>([]);
  const [nicheLeaders, setNicheLeaders] = useState<any[]>([]);
  const [contentGapIdeas, setContentGapIdeas] = useState<any[]>([]);
  const [musicPrompts, setMusicPrompts] = useState<any[]>([]);
  const [clonerInitialData, setClonerInitialData] = useState<{ title: string, desc: string } | null>(null);
  const [currentAnalysisNiche, setCurrentAnalysisNiche] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem("ai_cloner_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: if it's the old structure (has textModel), reset to default
        if (parsed.textModel && !parsed.analysisModel) {
          return DEFAULT_SETTINGS;
        }
        return parsed;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [showModelManager, setShowModelManager] = useState(false);
  const [clonedContentIds, setClonedContentIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("cloned_content_ids");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const handleMarkAsCloned = (id: string) => {
    const newSet = new Set(clonedContentIds);
    newSet.add(id);
    setClonedContentIds(newSet);
    localStorage.setItem("cloned_content_ids", JSON.stringify(Array.from(newSet)));
  };

  const saveSettings = (newSettings: AISettings) => {
    setAiSettings(newSettings);
    localStorage.setItem("ai_cloner_settings", JSON.stringify(newSettings));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAnalyzeChannel = async (channelName: string, niche: string, channelId?: string) => {
    setIsAnalyzingChannel(true);
    try {
      const [data, prompts] = await Promise.all([
        analyzeChannel(channelName, niche, aiSettings),
        (niche.toLowerCase().includes('lo-fi') || niche.toLowerCase().includes('music')) 
          ? generateMusicPrompts(channelName, niche, aiSettings)
          : Promise.resolve([])
      ]);
      setAnalyzedChannelData({ ...data, channelName, niche, musicPrompts: prompts, channelId });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingChannel(false);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const niches = await discoverHighPotentialNiches(aiSettings);
      setDiscoveredNiches(niches);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiscovering(false);
    }
  };

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  const deleteProject = async (id: number) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const handleSaveResearch = async (item: any) => {
    try {
      await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
    } catch (e) {
      console.error("Failed to save research:", e);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary text-ink font-sans selection:bg-ink selection:text-bg-primary">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-ink bg-bg-primary sticky top-0 z-[60]">
        <h1 className="text-lg font-bold tracking-tighter flex items-center gap-2">
          <Zap className="w-5 h-5 fill-ink" />
          AI CLONER
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          <LayoutDashboard className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 border-r border-ink bg-bg-primary z-50 transition-transform duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-ink flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2">
              <Zap className="w-6 h-6 fill-ink" />
              AI CLONER
            </h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 font-mono">Content Optimizer v1.0</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          <NavButton 
            active={activeTab === "dashboard"} 
            onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <NavButton 
            active={activeTab === "analyzer"} 
            onClick={() => { setActiveTab("analyzer"); setIsMobileMenuOpen(false); }}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Niche Analyzer"
          />
          <NavButton 
            active={activeTab === "cloner"} 
            onClick={() => { setActiveTab("cloner"); setIsMobileMenuOpen(false); }}
            icon={<Sparkles className="w-4 h-4" />}
            label="Content Cloner"
          />
          <NavButton 
            active={activeTab === "research"} 
            onClick={() => { setActiveTab("research"); setIsMobileMenuOpen(false); }}
            icon={<Search className="w-4 h-4" />}
            label="Research Library"
          />
          <NavButton 
            active={activeTab === "projects"} 
            onClick={() => { setActiveTab("projects"); setIsMobileMenuOpen(false); }}
            icon={<Layers className="w-4 h-4" />}
            label="My Projects"
          />
          <div className="pt-4 border-t border-[#141414]/10">
            <NavButton 
              active={showModelManager} 
              onClick={() => { setShowModelManager(true); setIsMobileMenuOpen(false); }}
              icon={<SettingsIcon className="w-4 h-4" />}
              label="AI Settings"
            />
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-6 border-t border-ink">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-bg-primary text-xs font-bold">
              MG
            </div>
            <div>
              <p className="text-xs font-bold">Matt Gaiser</p>
              <p className="text-[10px] opacity-50">Pro Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <Dashboard 
              onSelectNiche={(n) => {
                setSelectedNiche(n);
                setCurrentAnalysisNiche(n.name);
                setActiveTab("analyzer");
              }} 
              discoveredNiches={discoveredNiches}
              onDiscover={handleDiscover}
              isDiscovering={isDiscovering}
            />
          )}
          {activeTab === "analyzer" && (
            <Analyzer 
              selectedNiche={selectedNiche} 
              analyzedNicheName={currentAnalysisNiche}
              setAnalyzedNicheName={setCurrentAnalysisNiche}
              onClone={() => setActiveTab("cloner")}
              onAnalyzeChannel={handleAnalyzeChannel}
              analyzedChannelData={analyzedChannelData}
              isAnalyzingChannel={isAnalyzingChannel}
              onResetChannel={() => setAnalyzedChannelData(null)}
              onSaveProject={fetchProjects}
              onSaveResearch={handleSaveResearch}
              aiSettings={aiSettings}
              onUpdateSettings={saveSettings}
              report={analysisReport}
              setReport={setAnalysisReport}
              candidates={analysisCandidates}
              setCandidates={setAnalysisCandidates}
              nicheLeaders={nicheLeaders}
              setNicheLeaders={setNicheLeaders}
              contentGapIdeas={contentGapIdeas}
              setContentGapIdeas={setContentGapIdeas}
              onOpenSettings={() => setShowModelManager(true)}
              onCloneIdea={(title, desc) => {
                setClonerInitialData({ title, desc });
                setActiveTab("cloner");
              }}
              clonedContentIds={clonedContentIds}
              onMarkAsCloned={handleMarkAsCloned}
            />
          )}
          {activeTab === "cloner" && (
            <Cloner 
              niche={selectedNiche} 
              onSave={fetchProjects}
              discoveredNiches={discoveredNiches}
              onOpenVideoSuite={(data) => setVideoSuiteData(data)}
              aiSettings={aiSettings}
              onUpdateSettings={saveSettings}
              onOpenSettings={() => setShowModelManager(true)}
              initialData={clonerInitialData}
              onMarkAsCloned={handleMarkAsCloned}
            />
          )}
          {activeTab === "projects" && (
            <ProjectsList 
              projects={projects} 
              onDelete={deleteProject} 
              onSelect={(p) => setVideoSuiteData(p)}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "research" && (
            <ResearchList onNavigate={(tab) => setActiveTab(tab)} />
          )}
        </AnimatePresence>
      </main>

      {videoSuiteData && (
        <VideoSuite 
          data={videoSuiteData} 
          onClose={() => setVideoSuiteData(null)} 
          aiSettings={aiSettings}
          onUpdateSettings={saveSettings}
          onSaveProject={fetchProjects}
        />
      )}

      {showModelManager && (
        <ModelManager 
          settings={aiSettings} 
          onSave={saveSettings} 
          onClose={() => setShowModelManager(false)} 
        />
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border border-transparent",
        active ? "bg-ink text-bg-primary border-ink" : "hover:bg-ink/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Dashboard({ onSelectNiche, discoveredNiches, onDiscover, isDiscovering }: { 
  onSelectNiche: (n: any) => void, 
  discoveredNiches: any[], 
  onDiscover: () => void,
  isDiscovering: boolean
}) {
  const displayNiches = discoveredNiches.length > 0 ? discoveredNiches : AI_NICHES;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto"
    >
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter mb-2 italic font-serif">High Potential AI Niches</h2>
          <p className="text-[#141414]/60 max-w-2xl">
            We've analyzed current YouTube trends to identify the easiest niches to dominate using AI automation. 
            Select a niche to see the "improvement gaps" and start cloning.
          </p>
        </div>
        <button 
          onClick={onDiscover}
          disabled={isDiscovering}
          className="bg-[#141414] text-[#E4E3E0] px-6 py-3 text-sm font-bold flex items-center gap-2 hover:bg-[#141414]/90 disabled:opacity-50 transition-all shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]"
        >
          {isDiscovering ? (
            <>
              <div className="w-4 h-4 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Discover New Niches
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayNiches.map((niche, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectNiche(niche)}
            className="group relative bg-white border border-[#141414] p-8 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#141414]"
          >
            <div className="flex justify-between items-start mb-6">
              <span className={cn(
                "text-[10px] font-mono px-2 py-1 border border-[#141414]",
                niche.difficulty === "Easy" ? "bg-emerald-100" : "bg-amber-100"
              )}>
                {niche.difficulty?.toUpperCase() || "EASY"}
              </span>
              <TrendingUp className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <h3 className="text-2xl font-bold mb-2">{niche.name}</h3>
            <p className="text-sm text-[#141414]/60 mb-6 h-12 overflow-hidden">{niche.description}</p>
            
            <div className="space-y-4 pt-4 border-t border-[#141414]/10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest opacity-50">Potential</span>
                <span className="text-sm font-bold">{niche.earnings || niche.potential_earnings}</span>
              </div>
              
              {niche.popularity && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-50">
                    <span>Popularity</span>
                    <span>{niche.popularity}%</span>
                  </div>
                  <div className="h-1 bg-[#141414]/5 w-full">
                    <div className="h-full bg-[#141414]" style={{ width: `${niche.popularity}%` }} />
                  </div>
                </div>
              )}

              {niche.success_probability && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-50">
                    <span>Success Probability</span>
                    <span>{niche.success_probability}%</span>
                  </div>
                  <div className="h-1 bg-[#141414]/5 w-full">
                    <div className="h-full bg-emerald-500" style={{ width: `${niche.success_probability}%` }} />
                  </div>
                </div>
              )}

              {niche.saturation_level !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-50">
                    <span>Market Saturation</span>
                    <span>{niche.saturation_level}%</span>
                  </div>
                  <div className="h-1 bg-[#141414]/5 w-full">
                    <div 
                      className={cn(
                        "h-full",
                        niche.saturation_level > 70 ? "bg-red-500" : niche.saturation_level > 40 ? "bg-amber-500" : "bg-emerald-500"
                      )} 
                      style={{ width: `${niche.saturation_level}%` }} 
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {(niche.ai_tools || niche.ai_tools_needed || []).slice(0, 3).map((tool: string) => (
                  <span key={tool} className="text-[10px] bg-[#141414]/5 px-2 py-1">{tool}</span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm font-bold group-hover:gap-4 transition-all">
              Analyze Niche <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Analyzer({ 
  selectedNiche, 
  onClone, 
  onAnalyzeChannel, 
  analyzedChannelData, 
  isAnalyzingChannel,
  onResetChannel,
  onSaveProject,
  onSaveResearch,
  aiSettings,
  onUpdateSettings,
  report,
  setReport,
  candidates,
  setCandidates,
  nicheLeaders,
  setNicheLeaders,
  contentGapIdeas,
  setContentGapIdeas,
  onOpenSettings,
  onCloneIdea,
  clonedContentIds,
  onMarkAsCloned,
  analyzedNicheName,
  setAnalyzedNicheName
}: { 
  selectedNiche: Niche | null, 
  onClone: () => void,
  onAnalyzeChannel: (name: string, niche: string, channelId?: string) => void,
  analyzedChannelData: any | null,
  isAnalyzingChannel: boolean,
  onResetChannel: () => void,
  onSaveProject: () => void,
  onSaveResearch: (item: any) => void,
  aiSettings: AISettings,
  onUpdateSettings: (settings: AISettings) => void,
  report: string | null,
  setReport: (r: string | null) => void,
  candidates: any[],
  setCandidates: (c: any[]) => void,
  nicheLeaders: any[],
  setNicheLeaders: (l: any[]) => void,
  contentGapIdeas: any[],
  setContentGapIdeas: (i: any[]) => void,
  onOpenSettings: () => void,
  onCloneIdea: (title: string, desc: string) => void,
  clonedContentIds: Set<string>,
  onMarkAsCloned: (id: string) => void,
  analyzedNicheName: string | null,
  setAnalyzedNicheName: (name: string | null) => void
}) {
  const [loading, setLoading] = useState(false);
  const [customNiche, setCustomNiche] = useState("");
  const [ytSearchQuery, setYtSearchQuery] = useState("");
  const [ytResults, setYtResults] = useState<any[]>([]);
  const [ytLoading, setYtLoading] = useState(false);

  const runAnalysis = async (nicheName: string) => {
    setAnalyzedNicheName(nicheName);
    setLoading(true);
    onResetChannel();
    try {
      // First, try to find real channels if we have an API key
      let realChannels: any[] = [];
      if (aiSettings.youtubeApiKey) {
        try {
          const res = await fetch(`/api/youtube/search/channels?q=${encodeURIComponent(nicheName)}`, {
            headers: { 'x-youtube-api-key': aiSettings.youtubeApiKey }
          });
          const data = await res.json();
          if (!data.error) {
            realChannels = data.slice(0, 5);
            setYtResults(realChannels); // Populate search results with best channels
          }
        } catch (e) {
          console.error("Failed to fetch real channels for context", e);
        }
      }

      const [reportData, candidatesData, leadersData, gapsData] = await Promise.all([
        analyzeNiche(nicheName, aiSettings),
        identifyTrendingCandidates(nicheName, aiSettings),
        analyzeNicheLeaders(nicheName, aiSettings, realChannels),
        generateContentGapIdeas(nicheName, aiSettings)
      ]);
      
      setReport(reportData);
      setCandidates(candidatesData);
      setNicheLeaders(leadersData);
      setContentGapIdeas(gapsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleYtSearch = async () => {
    if (!ytSearchQuery) return;
    
    if (!aiSettings.youtubeApiKey) {
      alert("Please set your YouTube API Key in AI Settings to search channels.");
      onOpenSettings();
      return;
    }

    setYtLoading(true);
    try {
      const res = await fetch(`/api/youtube/search/channels?q=${encodeURIComponent(ytSearchQuery)}`, {
        headers: {
          'x-youtube-api-key': aiSettings.youtubeApiKey
        }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setYtResults(data);
    } catch (e) {
      console.error(e);
      alert("Failed to search YouTube. Please check your API key.");
    } finally {
      setYtLoading(false);
    }
  };

  useEffect(() => {
    if (selectedNiche && !report) {
      runAnalysis(selectedNiche.name);
    } else if (!selectedNiche && !report && !loading) {
      // Auto-analyze a high-potential default niche if none selected
      const defaultNiche = AI_NICHES.find(n => n.id === 'stoicism') || AI_NICHES[0];
      runAnalysis(defaultNiche.name);
    }
  }, [selectedNiche, report]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter italic font-serif">
            {analyzedNicheName ? `Analysis: ${analyzedNicheName}` : "Niche Analyzer"}
          </h2>
          <p className="text-[#141414]/60">Deep dive into market gaps and AI improvement opportunities.</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <QuickModelSelector 
            type="analysisModel" 
            settings={aiSettings} 
            onUpdate={onUpdateSettings}
            className="mb-2"
          />
          {!selectedNiche && (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Enter custom niche..." 
                className="bg-white border border-[#141414] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/20"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
              />
              <button 
                onClick={() => runAnalysis(customNiche)}
                className="bg-[#141414] text-[#E4E3E0] px-6 py-2 text-sm font-bold flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Analyze
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search YouTube Channels..." 
              className="bg-white border border-[#141414] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/20"
              value={ytSearchQuery}
              onChange={(e) => setYtSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleYtSearch()}
            />
            <button 
              onClick={handleYtSearch}
              className="bg-[#FF0000] text-white px-6 py-2 text-sm font-bold flex items-center gap-2 hover:bg-[#CC0000] transition-all"
            >
              <Youtube className="w-4 h-4" /> Search
            </button>
          </div>
        </div>
      </div>

      {ytResults.length > 0 && (
        <div className="mb-12 bg-white border border-[#141414] p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 italic font-serif">
              <Youtube className="w-5 h-5 text-[#FF0000]" /> YouTube Search Results
            </h3>
            <button 
              onClick={() => setYtResults([])}
              className="text-xs font-bold opacity-50 hover:opacity-100"
            >
              Clear Results
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ytResults.map((item: any) => (
              <div key={item.id.channelId} className="border border-[#141414]/10 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={item.snippet.thumbnails.default.url} 
                    alt={item.snippet.channelTitle}
                    className="w-12 h-12 rounded-full border border-[#141414]/10"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-sm truncate w-40">{item.snippet.channelTitle}</h4>
                    <p className="text-[10px] opacity-50">Channel</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => onAnalyzeChannel(item.snippet.channelTitle, selectedNiche?.name || customNiche || "General", item.id.channelId)}
                    disabled={isAnalyzingChannel}
                    className="py-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-2"
                  >
                    {isAnalyzingChannel ? (
                      <div className="w-3 h-3 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    Analyze
                  </button>
                  <button 
                    onClick={() => {
                      // @ts-ignore
                      handleSaveResearch({
                        type: 'channel',
                        external_id: item.id.channelId,
                        title: item.snippet.channelTitle,
                        description: item.snippet.description,
                        thumbnail_url: item.snippet.thumbnails.default.url,
                        stats: {}
                      });
                    }}
                    className="py-2 border border-[#141414] text-[#141414] text-[10px] font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-12 h-12 border-4 border-[#141414] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Scouring YouTube Data...</p>
        </div>
      ) : report ? (
        <div className="space-y-12">
          {/* Top Section: Market Report & Leaders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border border-[#141414] p-8">
                <div className="flex items-center gap-2 mb-6 text-[10px] uppercase tracking-widest font-bold opacity-50">
                  <FileText className="w-4 h-4" /> AI Market Report
                </div>
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:tracking-tight">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
              </div>

              {/* Content Gaps Section */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2 font-serif italic">
                  <Sparkles className="w-6 h-6 text-purple-600" /> Blue Ocean Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contentGapIdeas.map((idea, i) => (
                    <div key={i} className="bg-white border border-[#141414] p-6 hover:shadow-lg transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
                        {idea.contentType}
                      </div>
                      <h4 className="font-bold text-lg mb-2 pr-8">{idea.title}</h4>
                      <p className="text-xs text-gray-600 mb-4">{idea.gapFilled}</p>
                      
                      <div className="flex items-center gap-4 text-[10px] font-mono opacity-60 mb-4">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {idea.estimatedViews} Views</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Viral Potential</span>
                      </div>

                      <button 
                        onClick={() => onCloneIdea(idea.title, idea.gapFilled)}
                        className="w-full py-2 bg-[#141414] text-[#E4E3E0] text-xs font-bold hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-2 group-hover:translate-y-0 translate-y-1 opacity-0 group-hover:opacity-100 duration-200"
                      >
                        <Plus className="w-3 h-3" /> Create This Content
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: Niche Leaders */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Niche Leaders
              </h3>
              <div className="space-y-4">
                {nicheLeaders.map((leader, i) => (
                  <div key={i} className="bg-white border border-[#141414] p-6 space-y-4 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{leader.name}</h4>
                        <div className="flex gap-2 text-[10px] opacity-60 font-mono mt-1">
                          <span>{leader.subscriberCount} Subs</span>
                          <span>•</span>
                          <span>{leader.estimatedMonthlyRevenue}/mo</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono">{leader.clonePotential}</div>
                        <div className="text-[8px] uppercase tracking-widest opacity-50">Clone Score</div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-3 rounded text-xs">
                      <p className="font-bold opacity-70 uppercase text-[10px] tracking-wider">Why Target?</p>
                      <p>{leader.whyClone}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Top Content to Clone</p>
                      <ul className="space-y-3">
                        {leader.topContentToClone.map((content: any, j: number) => (
                          <li key={j} className="text-xs border-l-2 border-[#141414] pl-3 py-2 hover:bg-gray-50 group/item transition-colors">
                            <div className="font-medium mb-1">{content.title}</div>
                            
                            {(content.suggestedImprovedTitle || content.suggestedImprovement) ? (
                              <div className="mb-2 space-y-1">
                                {content.suggestedImprovedTitle && (
                                  <div className="text-[10px] text-emerald-600 font-bold flex items-start gap-1">
                                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>Suggested: "{content.suggestedImprovedTitle}"</span>
                                  </div>
                                )}
                                {content.suggestedImprovement && (
                                  <div className="text-[10px] opacity-60 italic pl-4">
                                    Angle: {content.suggestedImprovement}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="opacity-60 text-[10px] italic mb-2">{content.improvementAngle}</div>
                            )}

                            <button 
                              onClick={() => {
                                onMarkAsCloned(content.title);
                                onCloneIdea(content.suggestedImprovedTitle || content.title, content.suggestedImprovement || content.improvementAngle);
                              }}
                              disabled={clonedContentIds.has(content.title)}
                              className={cn(
                                "w-full py-1.5 text-[10px] font-bold transition-all flex items-center justify-center gap-1 opacity-0 group-hover/item:opacity-100",
                                clonedContentIds.has(content.title)
                                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              )}
                            >
                              {clonedContentIds.has(content.title) ? (
                                <><Copy className="w-3 h-3" /> Already Cloned</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Clone This Version</>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button 
                        onClick={() => onAnalyzeChannel(leader.name, selectedNiche?.name || customNiche)}
                        disabled={isAnalyzingChannel}
                        className="py-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold hover:bg-[#141414]/90 transition-all flex items-center justify-center gap-1"
                      >
                        {isAnalyzingChannel ? (
                          <div className="w-2 h-2 border border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Search className="w-3 h-3" />
                        )}
                        Analyze
                      </button>
                      <button 
                         onClick={() => {
                          // @ts-ignore
                          handleSaveResearch({
                            type: 'channel',
                            external_id: `leader-${i}`,
                            title: leader.name,
                            description: leader.whyClone,
                            thumbnail_url: "",
                            stats: { subs: leader.subscriberCount, revenue: leader.estimatedMonthlyRevenue }
                          });
                        }}
                        className="py-2 border border-[#141414] text-[#141414] text-[10px] font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-32 border-2 border-dashed border-[#141414]/20">
          <p className="opacity-50">Select a niche from the dashboard or enter a custom one to begin analysis.</p>
        </div>
      )}

      {analyzedChannelData && (
        <ChannelReport 
          data={analyzedChannelData} 
          onClose={onResetChannel} 
          onSaveProject={onSaveProject}
          onSaveResearch={onSaveResearch}
          aiSettings={aiSettings}
        />
      )}
    </motion.div>
  );
}

function VideoSuite({ 
  data, 
  onClose, 
  aiSettings, 
  onUpdateSettings,
  onSaveProject 
}: { 
  data: any, 
  onClose: () => void, 
  aiSettings: AISettings, 
  onUpdateSettings: (settings: AISettings) => void,
  onSaveProject?: () => void
}) {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [generatingVoiceover, setGeneratingVoiceover] = useState<Record<number, boolean>>({});
  const [voiceoverUrls, setVoiceoverUrls] = useState<Record<number, string>>({});
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [clipGenerations, setClipGenerations] = useState<Record<number, { loading: boolean, url?: string, error?: string }>>({});
  const [showMasterPreview, setShowMasterPreview] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [wanPrompts, setWanPrompts] = useState<any[]>([]);
  const [generatingWanPrompts, setGeneratingWanPrompts] = useState(false);
  const [videoSettings, setVideoSettings] = useState({ resolution: '720p', aspectRatio: '16:9' });
  const [voiceSettings, setVoiceSettings] = useState({ speed: 1.0 });
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [showVoiceLab, setShowVoiceLab] = useState(false);
  const [voiceLabText, setVoiceLabText] = useState("This is a preview of the selected voice. Adjust the speed and listen to how it sounds.");
  const [voiceLabLoading, setVoiceLabLoading] = useState(false);
  const [voiceLabAudioUrl, setVoiceLabAudioUrl] = useState<string | null>(null);
  const [voiceLabWaveSurfer, setVoiceLabWaveSurfer] = useState<WaveSurfer | null>(null);
  
  const [showWanOptions, setShowWanOptions] = useState(false);
  const [wanOptions, setWanOptions] = useState({
    shotType: 'Auto',
    subject: '',
    environment: '',
    lighting: 'Auto',
    atmosphere: 'Auto',
    cameraMotion: 'Auto',
    duration: '5'
  });
  
  const [generationMode, setGenerationMode] = useState<'gemini' | 'wan'>('gemini');

  // Normalize data from Project or Cloner result
  const scenes = React.useMemo(() => {
    if (data.scenes) return data.scenes;
    if (data.improved_script) {
      try { return JSON.parse(data.improved_script); } catch { return []; }
    }
    return [];
  }, [data]);

  const visualStyle = data.visualStyle || data.visual_prompts || "";

  useEffect(() => {
    if (data.wan_prompts) {
      try {
        const parsed = JSON.parse(data.wan_prompts);
        setWanPrompts(parsed);
        if (parsed.length > 0) setGenerationMode('wan');
      } catch (e) {
        console.error("Failed to parse existing Wan prompts", e);
      }
    } else {
      setWanPrompts([]);
    }
  }, [data]);

  const VOICES = [
    { id: 'Kore', name: 'Professional (Kore)', desc: 'Clear, authoritative, great for docs' },
    { id: 'Puck', name: 'Storyteller (Puck)', desc: 'Warm, engaging, ideal for children' },
    { id: 'Charon', name: 'Deep (Charon)', desc: 'Low, resonant, perfect for mystery' },
    { id: 'Fenrir', name: 'Energetic (Fenrir)', desc: 'Fast, high-energy, good for shorts' },
    { id: 'Zephyr', name: 'Soft (Zephyr)', desc: 'Calm, soothing, ideal for meditation' },
  ];

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    setApiKeySelected(hasKey);
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setApiKeySelected(true);
  };

  const handleGenerateVoiceover = async (index: number, text: string) => {
    setGeneratingVoiceover(prev => ({ ...prev, [index]: true }));
    try {
      const base64 = await generateVoiceover(text, aiSettings, selectedVoice, voiceSettings.speed);
      if (base64) {
        const blob = await (await fetch(`data:audio/pcm;base64,${base64}`)).blob();
        const url = URL.createObjectURL(blob);
        setVoiceoverUrls(prev => ({ ...prev, [index]: url }));
        
        // Initialize WaveSurfer
        setTimeout(() => {
          const container = document.getElementById(`waveform-${index}`);
          if (container) {
            const ws = WaveSurfer.create({
              container,
              waveColor: '#141414',
              progressColor: '#F27D26',
              height: 40,
              barWidth: 2,
            });
            ws.load(url);
          }
        }, 100);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingVoiceover(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePreviewVoice = async () => {
    setPreviewPlaying(true);
    try {
      const text = "This is a preview of the selected voice.";
      const base64 = await generateVoiceover(text, aiSettings, selectedVoice, voiceSettings.speed);
      if (base64) {
        const audio = new Audio(`data:audio/pcm;base64,${base64}`);
        audio.onended = () => setPreviewPlaying(false);
        await audio.play();
      } else {
        setPreviewPlaying(false);
      }
    } catch (e) {
      console.error(e);
      setPreviewPlaying(false);
    }
  };

  const handleVoiceLabGenerate = async () => {
    setVoiceLabLoading(true);
    try {
      const base64 = await generateVoiceover(voiceLabText, aiSettings, selectedVoice, voiceSettings.speed);
      if (base64) {
        const blob = await (await fetch(`data:audio/pcm;base64,${base64}`)).blob();
        const url = URL.createObjectURL(blob);
        setVoiceLabAudioUrl(url);
        
        // Initialize WaveSurfer if not already
        setTimeout(() => {
          const container = document.getElementById('voice-lab-waveform');
          if (container) {
            // Destroy previous instance if exists
            if (voiceLabWaveSurfer) {
              voiceLabWaveSurfer.destroy();
            }
            
            const ws = WaveSurfer.create({
              container,
              waveColor: '#141414',
              progressColor: '#F27D26',
              height: 60,
              barWidth: 3,
              cursorColor: '#F27D26',
              cursorWidth: 2,
            });
            
            ws.load(url);
            ws.on('finish', () => setPreviewPlaying(false));
            ws.on('play', () => setPreviewPlaying(true));
            ws.on('pause', () => setPreviewPlaying(false));
            
            setVoiceLabWaveSurfer(ws);
          }
        }, 100);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVoiceLabLoading(false);
    }
  };

  const toggleVoiceLabPlayback = () => {
    if (voiceLabWaveSurfer) {
      voiceLabWaveSurfer.playPause();
    }
  };

  const handleGenerateWanPrompts = async () => {
    setGeneratingWanPrompts(true);
    try {
      const prompts = await generateWanPrompts(scenes, visualStyle, aiSettings, wanOptions);
      setWanPrompts(prompts);
      setGenerationMode('wan');
      
      // Save to project if it exists
      if (data.id && onSaveProject) {
        try {
          await fetch(`/api/projects/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wan_prompts: JSON.stringify(prompts) })
          });
          onSaveProject();
        } catch (e) {
          console.error("Failed to save Wan prompts to project", e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingWanPrompts(false);
    }
  };

  const handleGenerateClip = async (index: number, prompt: string) => {
    setClipGenerations(prev => ({ ...prev, [index]: { loading: true } }));
    try {
      // Use Wan prompt if available and mode is wan, otherwise use the original prompt
      const finalPrompt = (generationMode === 'wan' && wanPrompts[index]?.wanPrompt) 
        ? wanPrompts[index].wanPrompt 
        : prompt;
      const operation = await generateVideoClip(finalPrompt, aiSettings, videoSettings); 
      let op = operation;
      
      while (!op.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        op = await pollVideoOperation(op.name, aiSettings);
      }

      const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env as any).API_KEY || "",
          },
        });
        const blob = await response.blob();
        setClipGenerations(prev => ({ ...prev, [index]: { loading: false, url: URL.createObjectURL(blob) } }));
      }
    } catch (e: any) {
      console.error(e);
      setClipGenerations(prev => ({ ...prev, [index]: { loading: false, error: e.message } }));
    }
  };

  const handleRenderVideo = async () => {
    setRendering(true);
    setRenderProgress(0);
    const ffmpeg = new FFmpeg();
    
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        setRenderProgress(Math.round(progress * 100));
      });

      // Process each scene
      const sceneFiles: string[] = [];
      for (let i = 0; i < data.scenes.length; i++) {
        const videoUrl = clipGenerations[i]?.url;
        const audioUrl = voiceoverUrls[i];
        
        if (videoUrl && audioUrl) {
          const videoName = `video${i}.mp4`;
          const audioName = `audio${i}.wav`;
          const outputName = `scene${i}.mp4`;
          
          await ffmpeg.writeFile(videoName, await fetchFile(videoUrl));
          await ffmpeg.writeFile(audioName, await fetchFile(audioUrl));
          
          // Combine audio and video for this scene
          // We use -shortest to match the length of the shortest stream (usually audio or video)
          await ffmpeg.exec(['-i', videoName, '-i', audioName, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', outputName]);
          sceneFiles.push(outputName);
        }
      }

      if (sceneFiles.length > 0) {
        // Create a concat file
        const concatContent = sceneFiles.map(f => `file '${f}'`).join('\n');
        await ffmpeg.writeFile('concat.txt', concatContent);
        
        // Concatenate all scenes
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'final_output.mp4']);
        
        const data = await ffmpeg.readFile('final_output.mp4');
        const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'final_video.mp4';
        a.click();
      }
    } catch (e) {
      console.error('FFmpeg Error:', e);
      alert('Rendering failed. Ensure all clips and voiceovers are generated.');
    } finally {
      setRendering(false);
    }
  };

  const RemotionComposition = () => {
    return (
      <AbsoluteFill style={{ backgroundColor: 'black' }}>
        {data.scenes.map((scene: any, idx: number) => {
          const videoUrl = clipGenerations[idx]?.url;
          const audioUrl = voiceoverUrls[idx];
          // We assume each scene is roughly 5 seconds for preview purposes
          // In a real app, we'd calculate duration from audio
          const duration = 150; // 5 seconds at 30fps
          
          return (
            <Sequence key={idx} from={idx * duration} durationInFrames={duration}>
              {videoUrl && <RemotionVideo src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              {audioUrl && <RemotionAudio src={audioUrl} />}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[150] bg-[#E4E3E0] overflow-y-auto p-4 md:p-12"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12 border-b border-[#141414] pb-8">
          <div>
            <h2 className="text-5xl font-bold tracking-tighter italic font-serif mb-2">Video Creation Suite</h2>
            <div className="flex items-center gap-6">
              <p className="text-[#141414]/60 uppercase tracking-widest text-xs font-bold">Style: {data.visualStyle}</p>
              <div className="h-4 w-px bg-[#141414]/20" />
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold opacity-40 uppercase">Video Engine</span>
                  <div className="flex items-center gap-2">
                    <QuickModelSelector 
                      type="videoModel" 
                      settings={aiSettings} 
                      onUpdate={onUpdateSettings}
                    />
                    <button 
                      onClick={() => setShowVideoSettings(!showVideoSettings)}
                      className={cn(
                        "p-1.5 border transition-all",
                        showVideoSettings ? "bg-[#141414] text-[#E4E3E0] border-[#141414]" : "bg-white border-[#141414] hover:bg-[#141414]/5"
                      )}
                      title="Video Settings"
                    >
                      <SettingsIcon className="w-3 h-3" />
                    </button>
                  </div>
                  {showVideoSettings && (
                    <div className="absolute mt-8 bg-white border border-[#141414] p-4 shadow-xl z-50 w-48 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold opacity-50">Resolution</label>
                        <select 
                          value={videoSettings.resolution}
                          onChange={(e) => setVideoSettings(prev => ({ ...prev, resolution: e.target.value }))}
                          className="w-full bg-[#141414]/5 border border-[#141414]/10 px-2 py-1 text-[10px] font-bold"
                        >
                          <option value="720p">720p HD</option>
                          <option value="1080p">1080p Full HD</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold opacity-50">Aspect Ratio</label>
                        <select 
                          value={videoSettings.aspectRatio}
                          onChange={(e) => setVideoSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
                          className="w-full bg-[#141414]/5 border border-[#141414]/10 px-2 py-1 text-[10px] font-bold"
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                          <option value="1:1">1:1 (Square)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold opacity-40 uppercase">Voice Engine</span>
                  <QuickModelSelector 
                    type="audioModel" 
                    settings={aiSettings} 
                    onUpdate={onUpdateSettings}
                  />
                </div>
                <div className="h-8 w-px bg-[#141414]/10 self-end mb-2" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold opacity-40 uppercase">Voice Persona</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-[#141414] px-2 py-1 shadow-[2px_2px_0px_0px_#141414]">
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer w-24"
                      >
                        {VOICES.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => setShowVoiceLab(!showVoiceLab)}
                      className={cn(
                        "p-1.5 border transition-all",
                        showVoiceLab ? "bg-[#141414] text-[#E4E3E0] border-[#141414]" : "bg-white border-[#141414] hover:bg-[#141414]/5"
                      )}
                      title="Open Voice Lab"
                    >
                      <Mic className="w-3 h-3" />
                    </button>
                  </div>
                  {showVoiceLab && (
                    <div className="absolute mt-8 right-0 bg-white border border-[#141414] p-6 shadow-xl z-50 w-96 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#141414]/10 pb-2">
                        <h4 className="text-sm font-bold italic font-serif">Voice Lab</h4>
                        <button onClick={() => setShowVoiceLab(false)} className="opacity-50 hover:opacity-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-bold opacity-50">Preview Text</label>
                        <textarea 
                          value={voiceLabText}
                          onChange={(e) => setVoiceLabText(e.target.value)}
                          className="w-full bg-[#141414]/5 border border-[#141414]/10 p-2 text-xs font-mono h-20 resize-none focus:outline-none focus:border-[#141414]/30"
                          placeholder="Enter text to preview voice..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-bold opacity-50">Speaking Rate: x{voiceSettings.speed}</label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1" 
                          value={voiceSettings.speed}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                          className="w-full h-1 bg-[#141414]/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#141414] [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>

                      <div className="bg-[#141414]/5 border border-[#141414]/10 p-4 rounded min-h-[80px] flex items-center justify-center relative">
                        {!voiceLabAudioUrl && !voiceLabLoading && (
                          <p className="text-[10px] opacity-40 text-center">Waveform visualization will appear here</p>
                        )}
                        {voiceLabLoading && <Loader2 className="w-6 h-6 animate-spin opacity-50" />}
                        <div id="voice-lab-waveform" className={cn("w-full", (!voiceLabAudioUrl || voiceLabLoading) && "hidden")} />
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={handleVoiceLabGenerate}
                          disabled={voiceLabLoading || !voiceLabText}
                          className="flex-1 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-bold hover:bg-[#141414]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {voiceLabLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Generate Preview
                        </button>
                        {voiceLabAudioUrl && (
                          <button 
                            onClick={toggleVoiceLabPlayback}
                            className="px-3 py-2 border border-[#141414] hover:bg-[#141414]/5 transition-all"
                          >
                            {previewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono opacity-50 w-8">x{voiceSettings.speed}</span>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1" 
                      value={voiceSettings.speed}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-20 h-1 bg-[#141414]/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#141414] [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowMasterPreview(true)}
              className="px-6 py-3 border border-[#141414] text-sm font-bold flex items-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
            >
              <MonitorPlay className="w-4 h-4" /> Master Preview
            </button>
            <button 
              onClick={handleRenderVideo}
              disabled={rendering}
              className="px-6 py-3 bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-[4px_4px_0px_0px_rgba(5,150,105,0.2)]"
            >
              {rendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rendering {renderProgress}%
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" /> Render Final Video
                </>
              )}
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-sm font-bold hover:bg-[#141414]/90 transition-all"
            >
              Close Suite
            </button>
          </div>
        </div>

        {/* Wan Prompts Generation */}
        <div className="mb-8 bg-white border border-[#141414] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold italic font-serif flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> Optimize Prompts for Wan 2.1
              </h3>
              <p className="text-xs opacity-60 mt-1">Generate highly detailed, motion-rich prompts specifically for the Wan 2.1 video model.</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex bg-[#141414]/5 p-1 rounded-lg border border-[#141414]/10">
                <button
                  onClick={() => setGenerationMode('gemini')}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                    generationMode === 'gemini' ? "bg-white shadow-sm text-[#141414]" : "text-[#141414]/50 hover:text-[#141414]"
                  )}
                >
                  Standard (Google)
                </button>
                <button
                  onClick={() => setGenerationMode('wan')}
                  disabled={wanPrompts.length === 0}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1",
                    generationMode === 'wan' ? "bg-[#141414] text-[#E4E3E0] shadow-sm" : "text-[#141414]/50 hover:text-[#141414]",
                    wanPrompts.length === 0 && "opacity-30 cursor-not-allowed"
                  )}
                >
                  Cinematic (Alibaba)
                  {wanPrompts.length === 0 && <Lock className="w-3 h-3" />}
                </button>
              </div>
              <div className="h-8 w-px bg-[#141414]/10" />
              <button
                onClick={() => setShowWanOptions(!showWanOptions)}
                className={cn(
                  "px-4 py-2 border text-xs font-bold transition-all flex items-center gap-2",
                  showWanOptions ? "bg-[#141414] text-[#E4E3E0] border-[#141414]" : "bg-white border-[#141414] hover:bg-[#141414]/5"
                )}
              >
                <SettingsIcon className="w-3 h-3" /> {showWanOptions ? "Hide Options" : "Configure Prompts"}
              </button>
              <button 
                onClick={handleGenerateWanPrompts}
                disabled={generatingWanPrompts}
                className="px-6 py-2 bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(147,51,234,0.2)]"
              >
                {generatingWanPrompts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Optimizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> {wanPrompts.length > 0 ? "Regenerate Prompts" : "Generate Wan Prompts"}
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showWanOptions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-[#141414]/5 p-6 border border-[#141414]/10">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Shot Type</label>
                    <select 
                      value={wanOptions.shotType}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, shotType: e.target.value }))}
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    >
                      <option value="Auto">Auto (AI Decides)</option>
                      <option value="Wide Shot">Wide Shot</option>
                      <option value="Close Up">Close Up</option>
                      <option value="Extreme Close Up">Extreme Close Up</option>
                      <option value="Medium Shot">Medium Shot</option>
                      <option value="Aerial View">Aerial View</option>
                      <option value="Low Angle">Low Angle</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Camera Motion</label>
                    <select 
                      value={wanOptions.cameraMotion}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, cameraMotion: e.target.value }))}
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    >
                      <option value="Auto">Auto (AI Decides)</option>
                      <option value="Static">Static</option>
                      <option value="Pan Left">Pan Left</option>
                      <option value="Pan Right">Pan Right</option>
                      <option value="Tilt Up">Tilt Up</option>
                      <option value="Tilt Down">Tilt Down</option>
                      <option value="Zoom In">Zoom In</option>
                      <option value="Zoom Out">Zoom Out</option>
                      <option value="Tracking Shot">Tracking Shot</option>
                      <option value="FPV Drone">FPV Drone</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Lighting</label>
                    <select 
                      value={wanOptions.lighting}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, lighting: e.target.value }))}
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    >
                      <option value="Auto">Auto (AI Decides)</option>
                      <option value="Cinematic Lighting">Cinematic Lighting</option>
                      <option value="Natural Sunlight">Natural Sunlight</option>
                      <option value="Golden Hour">Golden Hour</option>
                      <option value="Blue Hour">Blue Hour</option>
                      <option value="Neon Cyberpunk">Neon Cyberpunk</option>
                      <option value="Studio Lighting">Studio Lighting</option>
                      <option value="Dark & Moody">Dark & Moody</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Atmosphere</label>
                    <select 
                      value={wanOptions.atmosphere}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, atmosphere: e.target.value }))}
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    >
                      <option value="Auto">Auto (AI Decides)</option>
                      <option value="Foggy/Mist">Foggy/Mist</option>
                      <option value="Clear & Sharp">Clear & Sharp</option>
                      <option value="Dreamy/Soft">Dreamy/Soft</option>
                      <option value="Dusty/Gritty">Dusty/Gritty</option>
                      <option value="Rainy">Rainy</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Subject Focus (Optional)</label>
                    <input 
                      type="text"
                      value={wanOptions.subject}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. A red sports car"
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold opacity-50">Environment (Optional)</label>
                    <input 
                      type="text"
                      value={wanOptions.environment}
                      onChange={(e) => setWanOptions(prev => ({ ...prev, environment: e.target.value }))}
                      placeholder="e.g. Futuristic city street"
                      className="w-full bg-white border border-[#141414]/20 px-2 py-2 text-xs font-bold focus:outline-none focus:border-[#141414]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {wanPrompts.length === 0 && !generatingWanPrompts && (
            <div className="bg-[#141414]/5 p-4 border border-[#141414]/10 rounded mb-6">
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Example Output Format</h4>
              <p className="font-mono text-[10px] text-[#141414]/60 italic">
                "[WIDE SHOT] A futuristic cyberpunk city street at night, [NEON CYBERPUNK] lighting, [FOGGY/MIST] atmosphere, [TRACKING SHOT] camera movement, photorealistic 4K, 5 seconds"
              </p>
            </div>
          )}

          {wanPrompts.length > 0 && (
            <div className="space-y-4 mt-6 border-t border-[#141414]/10 pt-6">
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-60">Generated Wan 2.1 Prompts</h4>
              <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {wanPrompts.map((prompt, idx) => (
                  <div key={idx} className="bg-[#141414]/5 p-4 border border-[#141414]/10 text-xs">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold bg-[#141414] text-white px-2 py-0.5 text-[10px]">SCENE {prompt.sceneNumber}</span>
                      <span className="font-mono text-[10px] opacity-50">{prompt.durationSeconds}s • {prompt.shotType}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="font-bold opacity-50 text-[10px] uppercase block mb-1">Positive Prompt</span>
                        <p className="font-mono text-[#141414]/80 leading-relaxed select-all bg-white p-2 border border-[#141414]/10">
                          {prompt.wanPrompt}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold opacity-50 text-[10px] uppercase block mb-1">Negative Prompt</span>
                        <p className="font-mono text-[#141414]/50 select-all bg-white/50 p-2 border border-[#141414]/5">
                          {prompt.negativePrompt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showMasterPreview && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-12">
            <div className="max-w-4xl w-full space-y-6">
              <div className="flex items-center justify-between text-[#E4E3E0]">
                <h3 className="text-xl font-bold italic font-serif">Remotion Master Preview</h3>
                <button onClick={() => setShowMasterPreview(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                <Player
                  component={RemotionComposition}
                  durationInFrames={data.scenes.length * 150}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  controls
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <p className="text-center text-white/40 text-xs">
                This preview uses Remotion to sequence your AI-generated clips and voiceovers.
              </p>
            </div>
          </div>
        )}

        {!apiKeySelected ? (
          <div className="bg-white border border-[#141414] p-12 text-center space-y-6 shadow-[12px_12px_0px_0px_rgba(20,20,20,0.1)]">
            <div className="w-16 h-16 bg-[#141414] text-[#E4E3E0] rounded-full flex items-center justify-center mx-auto">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold italic font-serif">API Key Required for Video Generation</h3>
            <p className="max-w-md mx-auto opacity-60 text-sm">
              To generate high-quality AI video clips, you must select a paid Google Cloud API key. 
            </p>
            <button 
              onClick={handleSelectKey}
              className="px-8 py-4 bg-[#141414] text-[#E4E3E0] font-bold flex items-center gap-2 hover:bg-[#141414]/90 transition-all"
            >
              <Sparkles className="w-5 h-5" /> Select API Key
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Scene-by-Scene Production */}
            <div className="grid grid-cols-1 gap-8">
              {data.scenes.map((scene: any, idx: number) => (
                <div key={idx} className="bg-white border border-[#141414] overflow-hidden flex flex-col lg:flex-row shadow-[8px_8px_0px_0px_rgba(20,20,20,0.05)]">
                  {/* Script & Voiceover Part */}
                  <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-[#141414] space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold italic font-serif">Scene {idx + 1}: Script</h4>
                      {voiceoverUrls[idx] && (
                        <audio controls src={voiceoverUrls[idx]} className="h-8" />
                      )}
                    </div>
                    <p className="text-sm leading-relaxed opacity-80 bg-[#E4E3E0]/20 p-4 border border-[#141414]/5">
                      {scene.scriptPart}
                    </p>
                    
                    <div id={`waveform-${idx}`} className="w-full" />

                    <button 
                      onClick={() => handleGenerateVoiceover(idx, scene.scriptPart)}
                      disabled={generatingVoiceover[idx]}
                      className="w-full py-3 border border-[#141414] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0] disabled:opacity-50 transition-all"
                    >
                      {generatingVoiceover[idx] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      Generate Scene Voiceover
                    </button>
                  </div>

                  {/* Visual Generation Part */}
                  <div className="flex-1 p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold italic font-serif">Scene {idx + 1}: Visuals</h4>
                      <button 
                        onClick={() => handleGenerateClip(idx, scene.visualPrompt)}
                        disabled={clipGenerations[idx]?.loading}
                        className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-xs font-bold hover:bg-[#141414]/90 disabled:opacity-50 transition-all"
                      >
                        {clipGenerations[idx]?.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          generationMode === 'wan' ? "Generate (Alibaba)" : "Generate (Google)"
                        )}
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Visual Prompts</p>
                      </div>
                      
                      {/* Gemini Prompt */}
                      <div className="space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase opacity-50">Standard (Google)</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(scene.visualPrompt)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/5 rounded"
                            title="Copy Google Prompt"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs italic opacity-70 leading-relaxed bg-[#E4E3E0]/10 p-2 border border-[#141414]/5">
                          "{scene.visualPrompt}"
                        </p>
                      </div>

                      {/* Wan Prompt */}
                      {wanPrompts[idx] && (
                        <div className="space-y-2 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase text-purple-600">Cinematic (Alibaba)</span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(wanPrompts[idx].wanPrompt)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-100 rounded text-purple-700"
                              title="Copy Alibaba Prompt"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs font-bold text-purple-700 leading-relaxed bg-purple-50 p-2 border border-purple-100">
                            <span className="text-[8px] uppercase tracking-widest block opacity-50 mb-1">
                              {wanPrompts[idx].durationSeconds}s • {wanPrompts[idx].shotType}
                            </span>
                            "{wanPrompts[idx].wanPrompt}"
                          </p>
                        </div>
                      )}
                      
                      {clipGenerations[idx]?.url ? (
                        <div className="aspect-video bg-black border border-[#141414] overflow-hidden">
                          <video 
                            src={clipGenerations[idx].url} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-[#E4E3E0]/10 border border-dashed border-[#141414]/20 flex items-center justify-center">
                          <Video className="w-8 h-8 opacity-10" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChannelReport({ data, onClose, onSaveProject, onSaveResearch, aiSettings }: { data: any, onClose: () => void, onSaveProject: () => void, onSaveResearch: (item: any) => void, aiSettings: AISettings }) {
  const [cloningAll, setCloningAll] = useState(false);
  const [clonedVideos, setClonedVideos] = useState<Set<number>>(new Set());
  const [downloadingAssets, setDownloadingAssets] = useState(false);

  const handleCloneVideo = async (video: any, index: number) => {
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Improved: ${video.improvedTitle}`,
          niche: data.niche,
          original_channel: data.channelName,
          original_video_url: "",
          improved_script: `Original: ${video.originalTitle}\n\nImprovement Angle: ${video.improvementAngle}\n\nSuggested Description: ${video.improvedDescription}`,
          visual_prompts: "[]",
          improvement_suggestions: video.improvementAngle
        })
      });
      setClonedVideos(prev => new Set(prev).add(index));
      onSaveProject();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloneAll = async () => {
    setCloningAll(true);
    for (let i = 0; i < data.videos.length; i++) {
      if (!clonedVideos.has(i)) {
        await handleCloneVideo(data.videos[i], i);
      }
    }
    setCloningAll(false);
  };

  const downloadAssets = async () => {
    if (!data.channelId) {
      alert("Channel ID not available for asset download. Try analyzing via search.");
      return;
    }

    if (!aiSettings.youtubeApiKey) {
      alert("YouTube API Key required for asset download.");
      return;
    }

    setDownloadingAssets(true);
    try {
      const res = await fetch(`/api/youtube/channel-details?id=${data.channelId}`, {
         headers: { 'x-youtube-api-key': aiSettings.youtubeApiKey }
      });
      const details = await res.json();
      
      if (details.error) throw new Error(details.error);

      const zip = new JSZip();
      
      // Add report
      const reportContent = `CHANNEL ANALYSIS: ${data.channelName}\n\nSTRATEGY:\n${data.strategy}`;
      zip.file("report.txt", reportContent);

      // Helper to fetch image
      const fetchImage = async (url: string, name: string) => {
        try {
          const imgRes = await fetch(url);
          const blob = await imgRes.blob();
          zip.file(name, blob);
        } catch (e) {
          console.error("Failed to fetch image", url, e);
          zip.file(`${name}_error.txt`, `Failed to fetch: ${url}`);
        }
      };

      // Avatar
      if (details.snippet?.thumbnails?.high?.url) {
        await fetchImage(details.snippet.thumbnails.high.url, "avatar_high.jpg");
      } else if (details.snippet?.thumbnails?.default?.url) {
        await fetchImage(details.snippet.thumbnails.default.url, "avatar.jpg");
      }

      // Banner
      if (details.brandingSettings?.image?.bannerExternalUrl) {
         await fetchImage(details.brandingSettings.image.bannerExternalUrl + "=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj", "banner.jpg");
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.channelName.replace(/\s+/g, '_')}_assets.zip`;
      a.click();

    } catch (e) {
      console.error(e);
      alert("Failed to download assets. Please check API key and try again.");
    } finally {
      setDownloadingAssets(false);
    }
  };

  const downloadAll = () => {
    const content = `CHANNEL ANALYSIS: ${data.channelName}\n\nSTRATEGY:\n${data.strategy}\n\nVIDEOS:\n` + 
      data.videos.map((v: any, i: number) => `
VIDEO ${i+1}: ${v.originalTitle}
Views: ${v.views}
Ease of Creation: ${v.easeOfCreation}%
Improvement Angle: ${v.improvementAngle}
Improved Title: ${v.improvedTitle}
Improved Description: ${v.improvedDescription}
-------------------`).join("\n");

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.channelName.replace(/\s+/g, '_')}_analysis.txt`;
    a.click();
  };

  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  useEffect(() => {
    if (data && data.channelName && data.niche) {
      fetchProposals();
    }
  }, [data]);

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const props = await generateImprovedContentProposals(data.channelName, data.niche, aiSettings);
      setProposals(props);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleCloneProposal = async (proposal: any, index: number) => {
    setCloningAll(true); // Reusing this state for loading indicator
    try {
      // Create a project directly from the proposal
      const projectData = {
        title: proposal.improvedTitle,
        niche: data.niche,
        original_url: "",
        status: "draft",
        data: {
          improvedTitle: proposal.improvedTitle,
          improvedDescription: `Improved version of "${proposal.originalTitle}". Concept: ${proposal.improvedConcept}`,
          visualStyle: "Optimized for " + data.niche,
          scenes: [], // Will need to be generated later
          marketGapAnalysis: proposal.reason,
          nichePivots: []
        }
      };

      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData)
      });

      setClonedVideos(prev => new Set(prev).add(100 + index)); // Use offset ID for proposals
      onSaveProject();
    } catch (e) {
      console.error(e);
    } finally {
      setCloningAll(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[100] bg-[#E4E3E0] overflow-y-auto p-8"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12 border-b border-[#141414] pb-8">
          <div>
            <h2 className="text-5xl font-bold tracking-tighter italic font-serif mb-2">Channel Analysis: {data.channelName}</h2>
            <p className="text-[#141414]/60 uppercase tracking-widest text-xs font-bold">Deep Dive Strategy & Improvement Plan</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                onSaveResearch({
                  type: 'channel',
                  external_id: data.channelName,
                  title: data.channelName,
                  description: data.strategy,
                  thumbnail_url: "",
                  stats: { niche: data.niche }
                });
              }}
              className="px-6 py-3 border border-emerald-600 text-emerald-600 text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Save to Research
            </button>
            <button 
              onClick={downloadAll}
              className="px-6 py-3 border border-[#141414] text-sm font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Report
            </button>
            <button 
              onClick={downloadAssets}
              disabled={downloadingAssets || !data.channelId}
              className="px-6 py-3 border border-[#141414] bg-[#141414] text-[#E4E3E0] text-sm font-bold hover:bg-[#141414]/90 disabled:opacity-50 transition-all flex items-center gap-2"
              title={!data.channelId ? "Analyze via Search to enable asset download" : ""}
            >
              {downloadingAssets ? (
                <div className="w-4 h-4 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileArchive className="w-4 h-4" />
              )}
              Download Assets
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-sm font-bold hover:bg-[#141414]/90 transition-all"
            >
              Close Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white border border-[#141414] p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 italic font-serif">
                <Zap className="w-5 h-5" /> Improvement Strategy
              </h3>
              <p className="text-sm leading-relaxed opacity-80">{data.strategy}</p>
            </div>

            {/* Improved Content Proposals Section */}
            <div className="bg-[#141414] text-[#E4E3E0] p-8 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2 italic font-serif">
                <Sparkles className="w-5 h-5 text-emerald-400" /> "2.0 Version" Concepts
              </h3>
              <p className="text-[10px] opacity-50 uppercase tracking-widest">AI-Generated Improvements</p>
              
              {loadingProposals ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {proposals.map((prop, idx) => (
                    <div key={idx} className="p-4 border border-[#E4E3E0]/20 bg-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-1 uppercase tracking-widest font-bold">{prop.improvementType}</span>
                      </div>
                      <div>
                        <p className="text-[10px] opacity-40 mb-1">Original: "{prop.originalTitle}"</p>
                        <h4 className="font-bold text-sm text-emerald-300">"{prop.improvedTitle}"</h4>
                      </div>
                      <p className="text-[10px] opacity-70 leading-relaxed">{prop.improvedConcept}</p>
                      <button 
                        onClick={() => handleCloneProposal(prop, idx)}
                        disabled={clonedVideos.has(100 + idx)}
                        className="w-full py-2 mt-2 bg-[#E4E3E0] text-[#141414] text-[10px] font-bold hover:bg-white transition-all disabled:opacity-50"
                      >
                        {clonedVideos.has(100 + idx) ? "Saved to Projects" : "Clone This Concept"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.musicPrompts && data.musicPrompts.length > 0 && (
              <div className="bg-white border border-[#141414] p-8 space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2 italic font-serif">
                  <Volume2 className="w-5 h-5" /> Music Style Prompts
                </h3>
                <p className="text-[10px] opacity-50 uppercase tracking-widest">For Suno, Udio, or Stable Audio</p>
                <div className="space-y-4">
                  {data.musicPrompts.map((prompt: any, idx: number) => (
                    <div key={idx} className="p-4 border border-[#E4E3E0]/20 bg-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm">{prompt.styleName}</h4>
                        <span className="text-[10px] bg-white/10 px-2 py-1">{prompt.bpm}</span>
                      </div>
                      <p className="text-[10px] opacity-70">Mood: {prompt.mood}</p>
                      <div className="flex flex-wrap gap-1">
                        {prompt.instruments.map((inst: string) => (
                          <span key={inst} className="text-[9px] border border-white/10 px-1 opacity-50">{inst}</span>
                        ))}
                      </div>
                      <div className="pt-2">
                        <p className="text-[9px] uppercase opacity-40 mb-1">Master Prompt</p>
                        <div className="bg-black/40 p-2 text-[10px] font-mono break-all border border-white/5 group relative">
                          {prompt.masterPrompt}
                          <button 
                            onClick={() => navigator.clipboard.writeText(prompt.masterPrompt)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 transition-all"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={handleCloneAll}
              disabled={cloningAll || clonedVideos.size === data.videos.length}
              className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/90 disabled:opacity-50 transition-all shadow-[8px_8px_0px_0px_rgba(20,20,20,0.1)]"
            >
              {cloningAll ? (
                <div className="w-5 h-5 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {clonedVideos.size === data.videos.length ? "All Videos Cloned" : "Clone All High-Potential Videos"}
            </button>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold tracking-tight mb-6">High-Potential Videos to Clone</h3>
            <div className="space-y-4">
              {data.videos.map((v: any, i: number) => (
                <div key={i} className="bg-white border border-[#141414] p-8 flex flex-col md:flex-row gap-8 transition-all hover:shadow-[4px_4px_0px_0px_#141414]">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xl font-bold mb-1">{v.originalTitle}</h4>
                        <div className="flex gap-4">
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 flex items-center gap-1">
                            <Search className="w-3 h-3" /> {v.views} Views
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {v.easeOfCreation}% Ease
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Improvement Angle</p>
                        <p className="text-xs italic leading-relaxed">"{v.improvementAngle}"</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Suggested Title</p>
                        <p className="text-xs font-bold leading-relaxed">{v.improvedTitle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center md:border-l md:border-[#141414]/10 md:pl-8">
                    <button 
                      onClick={() => handleCloneVideo(v, i)}
                      disabled={clonedVideos.has(i)}
                      className={cn(
                        "px-6 py-3 text-xs font-bold transition-all flex items-center gap-2",
                        clonedVideos.has(i) 
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                          : "bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90"
                      )}
                    >
                      {clonedVideos.has(i) ? (
                        <>Cloned & Improved</>
                      ) : (
                        <><Plus className="w-4 h-4" /> Clone Video</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Cloner({ 
  niche, 
  onSave, 
  discoveredNiches, 
  onOpenVideoSuite, 
  aiSettings, 
  onUpdateSettings, 
  onOpenSettings, 
  initialData,
  onMarkAsCloned
}: { 
  niche: Niche | null, 
  onSave: () => void, 
  discoveredNiches: any[], 
  onOpenVideoSuite: (data: any) => void, 
  aiSettings: AISettings, 
  onUpdateSettings: (settings: AISettings) => void, 
  onOpenSettings: () => void,
  initialData: { title: string, desc: string } | null,
  onMarkAsCloned: (id: string) => void
}) {
  const [ytUrl, setYtUrl] = useState("");
  const [originalTitle, setOriginalTitle] = useState(initialData?.title || "");
  const [originalDesc, setOriginalDesc] = useState(initialData?.desc || "");
  const [currentNiche, setCurrentNiche] = useState<string>(niche?.name || AI_NICHES[0].name);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    if (initialData) {
      setOriginalTitle(initialData.title);
      setOriginalDesc(initialData.desc);
    }
  }, [initialData]);

  const displayNiches = discoveredNiches.length > 0 ? discoveredNiches : AI_NICHES;

  useEffect(() => {
    if (niche) {
      setCurrentNiche(niche.name);
    }
  }, [niche]);

  const handleFetchDetails = async () => {
    if (!ytUrl) return;
    
    if (!aiSettings.youtubeApiKey) {
      alert("Please set your YouTube API Key in AI Settings to fetch video details.");
      onOpenSettings();
      return;
    }

    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/youtube/video-details?url=${encodeURIComponent(ytUrl)}`, {
        headers: {
          'x-youtube-api-key': aiSettings.youtubeApiKey
        }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.snippet) {
        setOriginalTitle(data.snippet.title);
        setOriginalDesc(data.snippet.description);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch video details. Please check your API key.");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleClone = async () => {
    setLoading(true);
    try {
      const content = await generateImprovedContent(originalTitle, originalDesc, currentNiche, aiSettings);
      
      // Generate Wan prompts immediately
      let wanPrompts = [];
      try {
        wanPrompts = await generateWanPrompts(content.scenes, content.visualStyle, aiSettings);
      } catch (e) {
        console.error("Failed to generate Wan prompts automatically", e);
      }
      
      const fullResult = { ...content, wanPrompts };
      setResult(fullResult);
      
      // Auto-save to projects
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Improved: ${content.improvedTitle || originalTitle}`,
          niche: currentNiche,
          original_channel: "Unknown",
          original_video_url: "",
          improved_script: JSON.stringify(content.scenes), // Store scenes as JSON
          visual_prompts: content.visualStyle, // Store style guide here
          wan_prompts: JSON.stringify(wanPrompts), // Store Wan prompts
          improvement_suggestions: content.marketGapAnalysis,
          cloned_from: originalTitle
        })
      });
      onMarkAsCloned(originalTitle);
      onSave();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async () => {
    if (!result) return;
    
    const zip = new JSZip();
    
    // Add Script
    const fullScript = result.scenes.map((s: any) => s.scriptPart).join("\n\n");
    zip.file("script.md", fullScript);
    
    // Add Metadata
    const metadata = `Title: ${result.improvedTitle}\n\nDescription:\n${result.improvedDescription}\n\nNiche: ${currentNiche}\n\nVisual Style: ${result.visualStyle}`;
    zip.file("metadata.txt", metadata);
    
    // Add Visual Prompts
    const prompts = result.scenes.map((s: any, i: number) => `Scene ${i + 1} Prompt: ${s.visualPrompt}`).join("\n\n");
    zip.file("visual_prompts.txt", prompts);
    
    // Add Wan Prompts
    if (result.wanPrompts && result.wanPrompts.length > 0) {
      const wanPromptsText = result.wanPrompts.map((s: any) => 
        `Scene ${s.sceneNumber} Wan Prompt (${s.durationSeconds}s): ${s.wanPrompt}`
      ).join("\n\n");
      zip.file("wan_prompts.txt", wanPromptsText);
    }
    
    // Add Market Analysis
    const analysis = `Market Gap Analysis:\n${result.marketGapAnalysis}\n\nNiche Pivots:\n` + 
      result.nichePivots.map((p: any) => `- ${p.pivotName}: ${p.explanation}`).join("\n");
    zip.file("market_analysis.txt", analysis);
    
    // Add full JSON blueprint
    zip.file("blueprint.json", JSON.stringify(result, null, 2));
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.improvedTitle.replace(/\s+/g, '_')}_assets.zip`;
    a.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-12 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter italic font-serif">Content Cloner & Pivot</h2>
          <p className="text-[#141414]/60">Input an existing video's details to generate an improved AI version and identify high-potential niche pivots based on market gaps.</p>
        </div>
        <QuickModelSelector 
          type="cloningModel" 
          settings={aiSettings} 
          onUpdate={onUpdateSettings}
          className="mb-2"
        />
      </div>

      <div className="bg-white border border-[#141414] p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">YouTube Video URL (Optional - Auto-fill details)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-[#E4E3E0]/30 border border-[#141414] pl-4 pr-10 py-3 text-sm focus:outline-none focus:bg-white transition-all"
              />
              <button
                onClick={async () => {
                  try {
                    if (navigator && navigator.clipboard && navigator.clipboard.readText) {
                      const text = await navigator.clipboard.readText();
                      setYtUrl(text);
                    } else {
                      console.warn('Clipboard API not supported');
                      alert('Clipboard access is not supported in this environment. Please paste manually.');
                    }
                  } catch (err) {
                    console.error('Failed to read clipboard', err);
                    alert('Failed to read clipboard. Please check permissions.');
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#141414]/10 rounded transition-colors"
                title="Paste from Clipboard"
              >
                <Copy className="w-4 h-4 opacity-50" />
              </button>
            </div>
            <button 
              onClick={handleFetchDetails}
              disabled={fetchingDetails || !ytUrl}
              className="bg-[#141414] text-[#E4E3E0] px-6 py-3 text-sm font-bold flex items-center gap-2 hover:bg-[#141414]/90 disabled:opacity-50 transition-all"
            >
              {fetchingDetails ? (
                <div className="w-4 h-4 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Youtube className="w-4 h-4" />
              )}
              Fetch Details
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Original Video Title</label>
            <input 
              type="text" 
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
              placeholder="e.g. 10 Stoic Lessons for Life"
              className="w-full bg-[#E4E3E0]/30 border border-[#141414] px-4 py-3 text-sm focus:outline-none focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Target Niche</label>
            <select 
              value={currentNiche}
              onChange={(e) => setCurrentNiche(e.target.value)}
              className="w-full bg-[#141414] text-[#E4E3E0] px-4 py-3 text-sm font-bold focus:outline-none appearance-none cursor-pointer"
            >
              {displayNiches.map((n, idx) => (
                <option key={idx} value={n.name} className="bg-white text-[#141414]">
                  {n.name} (Success: {n.success_probability || 0}%, Clone: {n.cloning_potential || 0}%, Saturation: {n.saturation_level || 0}%)
                </option>
              ))}
              {!displayNiches.some(n => n.name === currentNiche) && (
                <option value={currentNiche} className="bg-white text-[#141414]">
                  {currentNiche}
                </option>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Original Description / Context</label>
          <textarea 
            rows={4}
            value={originalDesc}
            onChange={(e) => setOriginalDesc(e.target.value)}
            placeholder="Paste the original description or key points here..."
            className="w-full bg-[#E4E3E0]/30 border border-[#141414] px-4 py-3 text-sm focus:outline-none focus:bg-white transition-all resize-none"
          />
        </div>

        <button 
          onClick={handleClone}
          disabled={loading || !originalTitle}
          className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#E4E3E0] border-t-transparent rounded-full animate-spin" />
              Generating Improved Content...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Improved Version
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 space-y-8"
        >
          {/* Improved Metadata */}
          <div className="bg-white border border-[#141414] p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold italic font-serif">Improved Blueprint</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => onOpenVideoSuite(result)}
                  className="flex items-center gap-2 text-xs font-bold bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition-all shadow-[4px_4px_0px_0px_rgba(5,150,105,0.2)]"
                >
                  <Play className="w-4 h-4" /> Create Video Content
                </button>
                <button 
                  onClick={downloadZip}
                  className="flex items-center gap-2 text-xs font-bold bg-[#141414] text-[#E4E3E0] px-4 py-2 hover:bg-[#141414]/90 transition-all"
                >
                  <FileArchive className="w-4 h-4" /> Download All (ZIP)
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'improved-blueprint.json';
                    a.click();
                  }}
                  className="flex items-center gap-2 text-xs font-bold border border-[#141414] px-4 py-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                >
                  <Download className="w-4 h-4" /> Download JSON
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-1">Improved Title</p>
                <p className="text-lg font-bold">{result.improvedTitle}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-1">SEO Description</p>
                <p className="text-sm opacity-80">{result.improvedDescription}</p>
              </div>
            </div>
          </div>

          {/* Visual Prompts */}
          <div className="bg-white border border-[#141414] p-8">
            <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Video className="w-5 h-5" /> AI Visual Prompts
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {result.scenes.map((scene: any, idx: number) => (
                <div key={idx} className="p-4 bg-[#141414]/5 border border-[#141414]/10 flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-[#141414] text-[#E4E3E0] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs italic leading-relaxed">"{scene.visualPrompt}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Script */}
          <div className="bg-white border border-[#141414] p-8">
            <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Video Script
            </h4>
            <div className="prose prose-sm max-w-none bg-[#E4E3E0]/20 p-6 border border-[#141414]/10">
              {result.scenes.map((scene: any, idx: number) => (
                <div key={idx} className="mb-4">
                  <p className="text-[10px] uppercase font-bold opacity-30 mb-1">Scene {idx + 1}</p>
                  <p>{scene.scriptPart}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pivot Analysis */}
          <div className="bg-[#141414] text-[#E4E3E0] p-8">
            <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Market Gap & Niche Pivot Analysis
            </h4>
            <div className="space-y-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Market Gaps Identified</p>
                <div className="text-sm opacity-90 leading-relaxed">
                  <ReactMarkdown>{result.marketGapAnalysis}</ReactMarkdown>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.nichePivots.map((pivot: any, idx: number) => (
                  <div key={idx} className="p-6 border border-[#E4E3E0]/20 bg-white/5">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Pivot Idea {idx + 1}</p>
                    <p className="font-bold text-lg mb-2">{pivot.pivotName}</p>
                    <p className="text-xs opacity-70 leading-relaxed">{pivot.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ProjectsList({ projects, onDelete, onSelect, onNavigate }: { projects: Project[], onDelete: (id: number) => void, onSelect: (p: Project) => void, onNavigate: (tab: any) => void }) {
  // Defensive check for projects array
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-12">
        <h2 className="text-4xl font-bold tracking-tighter italic font-serif">My Projects</h2>
        <p className="text-[#141414]/60">Your library of improved content blueprints and niche variations.</p>
      </div>

      {safeProjects.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-[#141414]/20 flex flex-col items-center gap-4">
          <p className="opacity-50">No projects yet. Start by cloning some content!</p>
          <button 
            onClick={() => onNavigate("cloner")}
            className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-sm font-bold hover:bg-[#141414]/90 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Start New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-12 px-6 py-3 text-[10px] uppercase tracking-widest font-bold opacity-50 border-b border-[#141414]">
            <div className="col-span-5">Project Title</div>
            <div className="col-span-2">Niche</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {safeProjects.map((project) => (
            <div 
              key={project.id}
              onClick={() => onSelect(project)}
              className="grid grid-cols-12 items-center px-6 py-4 bg-white border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group cursor-pointer"
            >
              <div className="col-span-5 font-bold truncate pr-4 flex items-center gap-2">
                {project.title}
                {project.wan_prompts && <span className="text-[8px] bg-purple-500 text-white px-1 py-0.5 rounded">WAN</span>}
                {project.gemini_video_url && <span className="text-[8px] bg-blue-500 text-white px-1 py-0.5 rounded">VEO</span>}
              </div>
              <div className="col-span-2 text-xs font-mono">{project.niche}</div>
              <div className="col-span-2 text-xs opacity-60">{new Date(project.created_at).toLocaleDateString()}</div>
              <div className="col-span-2">
                <span className="text-[10px] border border-current px-2 py-0.5 uppercase">{project.status}</span>
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                  className="p-2 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ResearchList({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [research, setResearch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [aiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem("ai_cloner_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Defensive check for research array
  const safeResearch = Array.isArray(research) ? research : [];

  const fetchResearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research");
      const data = await res.json();
      setResearch(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  const deleteResearch = async (id: number) => {
    await fetch(`/api/research/${id}`, { method: "DELETE" });
    fetchResearch();
  };

  const refreshResearch = async (item: any) => {
    setRefreshing(item.id);
    try {
      let updatedItem = { ...item };
      
      if (item.type === 'channel') {
        // Fetch fresh analysis
        const analysis = await analyzeChannel(item.title, item.stats?.niche || "General", aiSettings);
        updatedItem.description = analysis.strategy;
        // Merge stats, keeping existing ones if not updated
        updatedItem.stats_json = JSON.stringify({
          ...(item.stats_json ? JSON.parse(item.stats_json) : {}),
          ...analysis.stats
        });
      }

      await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem)
      });
      fetchResearch();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-12 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold tracking-tighter italic font-serif">Research Library</h2>
          <p className="text-[#141414]/60">Saved YouTube channels, videos, and market analysis for future reference.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              setLoading(true);
              for (const item of safeResearch) {
                await refreshResearch(item);
              }
              setLoading(false);
            }}
            className="px-4 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-bold flex items-center gap-2 hover:bg-[#141414]/90 transition-all"
          >
            <Youtube className="w-4 h-4" /> Sync All with YouTube
          </button>
          <button 
            onClick={fetchResearch}
            className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
            title="Refresh List"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin opacity-20" />
        </div>
      ) : safeResearch.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-[#141414]/20 flex flex-col items-center gap-4">
          <p className="opacity-50">Your research library is empty. Save channels or videos from the Analyzer to see them here.</p>
          <button 
            onClick={() => onNavigate("analyzer")}
            className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-sm font-bold hover:bg-[#141414]/90 transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> Go to Analyzer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeResearch.map((item) => {
            const stats = JSON.parse(item.stats_json || '{}');
            return (
              <div key={item.id} className="bg-white border border-[#141414] p-6 flex flex-col justify-between group hover:shadow-[8px_8px_0px_0px_#141414] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono px-2 py-1 border border-[#141414] bg-[#141414] text-[#E4E3E0]">
                      {item.type.toUpperCase()}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => refreshResearch(item)}
                        disabled={refreshing === item.id}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-emerald-500 transition-all disabled:opacity-50"
                        title="Refresh Data"
                      >
                        <TrendingUp className={cn("w-4 h-4", refreshing === item.id && "animate-spin")} />
                      </button>
                      <button 
                        onClick={() => deleteResearch(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    {item.thumbnail_url && (
                      <img 
                        src={item.thumbnail_url} 
                        alt={item.title} 
                        className="w-12 h-12 rounded-full border border-[#141414]/10"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{item.title}</h3>
                      <p className="text-[10px] opacity-50">ID: {item.external_id}</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-[#141414]/60 mb-6 line-clamp-3">{item.description}</p>
                  
                  {Object.keys(stats).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {Object.entries(stats).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-[#141414]/5 p-2">
                          <p className="text-[8px] uppercase opacity-40">{key}</p>
                          <p className="text-[10px] font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-[#141414]/10 flex items-center justify-between">
                  <span className="text-[10px] opacity-40">Updated {new Date(item.last_updated).toLocaleDateString()}</span>
                  <a 
                    href={`https://youtube.com/${item.type === 'channel' ? 'channel/' : 'watch?v='}${item.external_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold flex items-center gap-1 hover:underline"
                  >
                    View on YT <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
