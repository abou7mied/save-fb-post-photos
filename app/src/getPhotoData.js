// Resolves a photo's full-resolution URL and the id of the next photo in its
// media set by calling Facebook's own CometPhotoRootContentQuery on
// /api/graphql/ — the same request the photo viewer makes. The photo page
// HTML is an empty shell nowadays, so scraping it no longer works.
//
// The doc_id and fb_dtsg tokens are supplied by main-world.js, which runs in
// the page's main world and reads them from Facebook's module system.

const cache = new Map();
let tokensPromise = null;

export default function getPhotoData(photoId, setToken) {
  const key = String(photoId);
  if (!cache.has(key)) {
    const promise = fetchPhotoData(key, setToken)
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, promise);
  }
  return cache.get(key);
}

function getTokens() {
  if (!tokensPromise) {
    tokensPromise = requestTokens().catch((error) => {
      tokensPromise = null;
      throw error;
    });
  }
  return tokensPromise;
}

function requestTokens() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Timed out reading Facebook tokens from the page.'));
    }, 10000);

    function onMessage(event) {
      if (event.source !== window || !event.data || event.data.type !== 'sfpp-tokens') {
        return;
      }
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      const { tokens } = event.data;
      if (!tokens || !tokens.docId || !tokens.dtsg) {
        reject(new Error('Could not read the Facebook photo API tokens from the page.'));
        return;
      }
      resolve(tokens);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'sfpp-request-tokens' }, window.location.origin);
  });
}

async function fetchPhotoData(photoId, setToken) {
  const tokens = await getTokens();
  const variables = {
    UFI2CommentsProvider_commentsKey: 'CometPhotoRootQuery',
    feedbackSource: 65,
    feedLocation: 'COMET_MEDIA_VIEWER',
    isMediaset: !!setToken,
    mediasetToken: setToken || '',
    nodeID: photoId,
    privacySelectorRenderLocation: 'COMET_MEDIA_VIEWER',
    renderLocation: 'comet_media_viewer',
    scale: 1,
    useDefaultActor: false,
  };
  const body = new URLSearchParams({
    fb_dtsg: tokens.dtsg,
    doc_id: tokens.docId,
    variables: JSON.stringify(variables),
    server_timestamps: 'true',
  });
  const response = await fetch(`${window.location.origin}/api/graphql/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-FB-Friendly-Name': 'CometPhotoRootContentQuery',
    },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`Photo API request failed (HTTP ${response.status})`);
  }
  const text = await response.text();
  const data = parseGraphQLResponse(text);
  if (!data.uri) {
    throw new Error('Could not find the photo URL in the API response. Facebook may have changed its page format.');
  }
  return data;
}

// The response is one or more newline-separated JSON payloads (Relay streams
// deferred chunks in the same body).
function parseGraphQLResponse(text) {
  const result = {
    uri: null,
    nextId: null,
  };
  const lines = text.split('\n');
  for (let i = 0; i < lines.length && !(result.uri && result.nextId); i++) {
    const line = lines[i].trim();
    if (line) {
      let json = null;
      try {
        json = JSON.parse(line);
      } catch (error) {
        // Not valid JSON, skip it.
      }
      if (json) {
        searchNode(json, result, 0);
      }
    }
  }
  return result;
}

function searchNode(node, result, depth) {
  if (!node || typeof node !== 'object' || depth > 60) {
    return;
  }
  if (node.currMedia && typeof node.currMedia === 'object' && !result.uri) {
    const media = node.currMedia;
    const image = media.image || media.viewer_image || media.photo_image;
    if (image && image.uri) {
      result.uri = image.uri;
    }
  }
  if (node.nextMediaAfterNodeId && node.nextMediaAfterNodeId.id && !result.nextId) {
    result.nextId = String(node.nextMediaAfterNodeId.id);
  }
  if (result.uri && result.nextId) {
    return;
  }
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    searchNode(node[keys[i]], result, depth + 1);
  }
}
