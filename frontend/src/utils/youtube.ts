// YouTube URL parser and helper utility
// Strictly no emojis

export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Handles:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://www.youtube.com/live/VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  // - https://music.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://youtube.com/shorts/VIDEO_ID
  // - /watch?v=VIDEO_ID
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export function isYouTubeUrl(url?: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export function getYouTubeEmbedUrl(url?: string): string | null {
  const id = extractYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&playsinline=1`;
}

export function loadYouTubeIFrameApi(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    if ((window as any).YT && (window as any).YT.Player) {
      resolve((window as any).YT);
      return;
    }

    // Register callback in global queue
    if (!(window as any).__ytReadyCallbacks) {
      (window as any).__ytReadyCallbacks = [];
    }
    (window as any).__ytReadyCallbacks.push(resolve);

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';

      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      (window as any).onYouTubeIframeAPIReady = () => {
        const cbs = (window as any).__ytReadyCallbacks || [];
        cbs.forEach((cb: (yt: any) => void) => cb((window as any).YT));
        (window as any).__ytReadyCallbacks = [];
      };
    }
  });
}
