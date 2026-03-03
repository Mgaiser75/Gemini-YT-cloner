export interface Project {
  id: number;
  title: string;
  niche: string;
  original_channel?: string;
  original_video_url?: string;
  improved_script?: string;
  visual_prompts?: string;
  improvement_suggestions?: string;
  status: string;
  created_at: string;
}

export interface Niche {
  id: string;
  name: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  potential_earnings: string;
  ai_tools_needed: string[];
  examples: string[];
  success_probability?: number;
  cloning_potential?: number;
  saturation_level?: number;
}

export const AI_NICHES: Niche[] = [
  {
    id: "explainer",
    name: "Explainer Videos",
    description: "Educational videos using whiteboard animations or motion graphics.",
    difficulty: "Easy",
    potential_earnings: "$2k - $10k / mo",
    ai_tools_needed: ["Gemini (Script)", "HeyGen/D-ID (Avatar)", "ElevenLabs (Voice)"],
    examples: ["Kurzgesagt (Style)", "The Infographics Show"],
    success_probability: 75,
    cloning_potential: 85,
    saturation_level: 65
  },
  {
    id: "kids",
    name: "Children's Content",
    description: "Nursery rhymes, bedtime stories, and educational animations for kids.",
    difficulty: "Easy",
    potential_earnings: "$5k - $50k / mo",
    ai_tools_needed: ["Gemini (Story)", "Midjourney/Leonardo (Characters)", "Luma/Runway (Animation)"],
    examples: ["Cocomelon (Style)", "Pinkfong"],
    success_probability: 90,
    cloning_potential: 80,
    saturation_level: 85
  },
  {
    id: "stoicism",
    name: "Stoicism & Motivation",
    description: "Faceless channels with deep quotes, philosophical insights, and cinematic visuals.",
    difficulty: "Easy",
    potential_earnings: "$1k - $5k / mo",
    ai_tools_needed: ["Gemini (Quotes/Script)", "Pexels/Stock (Visuals)", "ElevenLabs (Deep Voice)"],
    examples: ["Daily Stoic", "The Art of Improvement"],
    success_probability: 85,
    cloning_potential: 95,
    saturation_level: 40
  },
  {
    id: "loops",
    name: "24/7 Lo-fi Loops",
    description: "Continuous music streams with a single high-quality loop animation.",
    difficulty: "Easy",
    potential_earnings: "$500 - $3k / mo",
    ai_tools_needed: ["Suno/Udio (Music)", "Leonardo (Lo-fi Art)", "CapCut (Looping)"],
    examples: ["Lofi Girl", "Chillhop Music"],
    success_probability: 60,
    cloning_potential: 90,
    saturation_level: 70
  },
  {
    id: "facts",
    name: "Fact & Trivia Shorts",
    description: "Rapid-fire facts and trivia for YouTube Shorts and TikTok.",
    difficulty: "Easy",
    potential_earnings: "$1k - $8k / mo",
    ai_tools_needed: ["Gemini (Facts)", "Canva (Templates)", "AI Voiceover"],
    examples: ["Be Amazed", "Bright Side"],
    success_probability: 80,
    cloning_potential: 88,
    saturation_level: 75
  }
];
