const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.fdn.fr",
  "https://vid.puffyan.us",
];

function getApiKey(apiKey?: string) {
  return apiKey || process.env.YOUTUBE_API_KEY;
}

async function fetchInvidious(endpoint: string, params: Record<string, any>) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = new URL(`${instance}/api/v1/${endpoint}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
      const response = await fetch(url.toString());
      if (response.ok) return await response.json();
    } catch (e) {
      console.warn(`Invidious instance ${instance} failed:`, e);
      continue;
    }
  }
  throw new Error("All public YouTube API instances failed. Please try again later or add your own API key.");
}

async function fetchYouTube(endpoint: string, params: Record<string, string | number | string[]>, apiKey?: string) {
  const key = getApiKey(apiKey);
  
  if (!key) {
    // Fallback to Invidious if no key
    return null; 
  }

  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  
  // Add API key
  url.searchParams.append("key", key);
  
  // Add other params
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      url.searchParams.append(k, v.join(","));
    } else {
      url.searchParams.append(k, String(v));
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`YouTube API Error (${endpoint}):`, JSON.stringify(errorData, null, 2));
    throw new Error(errorData.error?.message || `YouTube API request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function searchYouTubeChannels(query: string, apiKey?: string) {
  const data = await fetchYouTube("search", {
    part: "snippet",
    q: query,
    type: "channel",
    maxResults: 5
  }, apiKey);

  if (data) return data.items || [];

  // Fallback
  const invData = await fetchInvidious("search", { q: query, type: "channel" });
  return invData.map((item: any) => ({
    id: { kind: "youtube#channel", channelId: item.authorId },
    snippet: {
      title: item.author,
      description: item.description,
      thumbnails: { default: { url: item.authorThumbnails?.[0]?.url } }
    }
  }));
}

export async function searchYouTubeVideos(query: string, apiKey?: string) {
  const data = await fetchYouTube("search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: 5,
    order: "viewCount"
  }, apiKey);

  if (data) return data.items || [];

  // Fallback
  const invData = await fetchInvidious("search", { q: query, type: "video" });
  return invData.map((item: any) => ({
    id: { kind: "youtube#video", videoId: item.videoId },
    snippet: {
      title: item.title,
      channelTitle: item.author,
      description: item.description,
      thumbnails: { default: { url: item.videoThumbnails?.[0]?.url } }
    }
  }));
}

export async function getVideoDetails(videoId: string, apiKey?: string) {
  const data = await fetchYouTube("videos", {
    part: "snippet,statistics",
    id: videoId
  }, apiKey);

  if (data) return data.items?.[0] || null;

  // Fallback
  try {
    const item = await fetchInvidious(`videos/${videoId}`, {});
    return {
      id: videoId,
      snippet: {
        title: item.title,
        description: item.description,
        thumbnails: { default: { url: item.videoThumbnails?.[0]?.url } },
        channelTitle: item.author,
        publishedAt: new Date(item.published * 1000).toISOString()
      },
      statistics: {
        viewCount: String(item.viewCount),
        likeCount: String(item.likeCount),
        commentCount: "0" // Not always available
      }
    };
  } catch (e) {
    console.error("Fallback video details failed:", e);
    return null;
  }
}

export async function getChannelDetails(channelId: string, apiKey?: string) {
  const data = await fetchYouTube("channels", {
    part: "snippet,brandingSettings,statistics",
    id: channelId
  }, apiKey);

  if (data) return data.items?.[0] || null;

  // Fallback
  try {
    const item = await fetchInvidious(`channels/${channelId}`, {});
    return {
      id: channelId,
      snippet: {
        title: item.author,
        description: item.description,
        thumbnails: { default: { url: item.authorThumbnails?.[0]?.url } },
        customUrl: item.authorUrl
      },
      statistics: {
        subscriberCount: String(item.subCount),
        videoCount: "0", // Not always available easily
        viewCount: "0"
      },
      brandingSettings: {
        image: {
          bannerExternalUrl: item.authorBanners?.[0]?.url
        }
      }
    };
  } catch (e) {
    console.error("Fallback channel details failed:", e);
    return null;
  }
}

export function extractVideoId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
