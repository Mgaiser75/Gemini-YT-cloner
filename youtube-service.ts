import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export async function searchYouTubeChannels(query: string) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  const res = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["channel"],
    maxResults: 5,
  });

  return res.data.items || [];
}

export async function searchYouTubeVideos(query: string) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  const res = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults: 5,
    order: "viewCount",
  });

  return res.data.items || [];
}

export async function getVideoDetails(videoId: string) {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }

  const res = await youtube.videos.list({
    part: ["snippet", "statistics"],
    id: [videoId],
  });

  return res.data.items?.[0] || null;
}

export function extractVideoId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
