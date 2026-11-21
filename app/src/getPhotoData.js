// Resolves a photo's full-resolution URL and the ids of adjacent photos in its
// media set by calling Facebook's own CometPhotoRootContentQuery on
// /api/graphql/ — the same request the photo viewer makes. The photo page
// HTML is an empty shell nowadays, so scraping it no longer works.
//
// The doc_id, providedVariables, fb_dtsg, and lsd tokens are supplied by
// main-world.js, which runs in the page's main world and reads them from
// Facebook's module system.

const cache = new Map();
let tokensPromise = null;
const MAX_RETRIES = 2;

export default function getPhotoData(photoId, setToken) {
  const key = `${String(photoId)}::${setToken || ''}`;
  if (!cache.has(key)) {
    const promise = fetchPhotoDataWithRetry(String(photoId), setToken)
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, promise);
  }
  return cache.get(key);
}

async function fetchPhotoDataWithRetry(photoId, setToken) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchPhotoData(photoId, setToken); // eslint-disable-line no-await-in-loop
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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
      if (!tokens || !tokens.docId || (!tokens.dtsg && !tokens.lsd)) {
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
  const variables = Object.assign(
    {},
    tokens.providedVariables || {},
    {
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
    },
  );
  const bodyParams = {
    doc_id: tokens.docId,
    variables: JSON.stringify(variables),
    server_timestamps: 'true',
  };
  if (tokens.dtsg) {
    bodyParams.fb_dtsg = tokens.dtsg;
  }
  if (tokens.lsd) {
    bodyParams.lsd = tokens.lsd;
  }
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-FB-Friendly-Name': 'CometPhotoRootContentQuery',
  };
  if (tokens.lsd) {
    headers['X-FB-LSD'] = tokens.lsd;
  }
  const body = new URLSearchParams(bodyParams);
  // In Firefox MV2 content scripts, content.fetch runs with the page's exact
  // security principal and cookies; in MV3 (Chrome & Firefox) standard fetch does.
  // eslint-disable-next-line no-undef
  const pageFetch = (typeof content !== 'undefined' && content && typeof content.fetch === 'function')
    // eslint-disable-next-line no-undef
    ? content.fetch.bind(content)
    : fetch;
  const response = await pageFetch(`${window.location.origin}/api/graphql/`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body.toString(),
  });
  if (!response.ok) {
    tokensPromise = null;
    throw new Error(`Photo API request failed (HTTP ${response.status})`);
  }
  const text = await response.text();
  const data = parseGraphQLResponse(text);
  if (!data.uri) {
    if (data.errors.length) {
      tokensPromise = null;
      throw new Error(`Facebook GraphQL error: ${data.errors[0]}`);
    }
    throw new Error('Could not find the photo URL in the API response. Facebook may have changed its page format.');
  }
  return data;
}

// The response is one or more newline-separated JSON payloads (Relay streams
// deferred chunks in the same body).
export function parseGraphQLResponse(text) {
  const result = {
    uri: null,
    nextId: null,
    prevId: null,
    errors: [],
  };
  const cleaned = text.replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;\s*/, '');
  const lines = cleaned.split('\n');
  for (let i = 0; i < lines.length && !(result.uri && result.nextId && result.prevId); i++) {
    const line = lines[i].trim();
    if (line) {
      let json = null;
      try {
        json = JSON.parse(line);
      } catch (error) {
        // Not valid JSON, skip it.
      }
      if (json) {
        if (Array.isArray(json.errors)) {
          for (let j = 0; j < json.errors.length; j++) {
            const err = json.errors[j];
            if (err && err.message) {
              result.errors.push(String(err.message));
            }
          }
        }
        searchNode(json, result, 0);
      }
    }
  }
  return result;
}

function pickBestImageUri(media) {
  // Collect all candidate photo objects to ensure we pick the maximum resolution
  const candidates = [
    media.image,
    media.viewer_image,
    media.photo_image,
    media.large_share_image,
  ].filter(img => img && img.uri);

  if (candidates.length > 0) {
    // Sort candidates by pixel dimensions descending to guarantee highest quality
    candidates.sort((a, b) => {
      const areaA = (a.width || 0) * (a.height || 0);
      const areaB = (b.width || 0) * (b.height || 0);
      return areaB - areaA;
    });
    return candidates[0].uri;
  }
  return null;
}

function searchNode(node, result, depth) {
  if (!node || typeof node !== 'object' || depth > 60) {
    return;
  }
  if (!result.uri) {
    let media = null;
    if (node.currMedia && typeof node.currMedia === 'object') {
      media = node.currMedia;
    } else if (
      Array.isArray(node.path)
      && node.path[0] === 'currMedia'
      && node.data
      && typeof node.data === 'object'
    ) {
      media = node.data;
    }
    if (media) {
      const bestUri = pickBestImageUri(media);
      if (bestUri) {
        result.uri = bestUri;
      }
    }
  }
  if (node.nextMediaAfterNodeId && node.nextMediaAfterNodeId.id && !result.nextId) {
    result.nextId = String(node.nextMediaAfterNodeId.id);
  }
  if (node.prevMediaBeforeNodeId && node.prevMediaBeforeNodeId.id && !result.prevId) {
    result.prevId = String(node.prevMediaBeforeNodeId.id);
  }
  if (result.uri && result.nextId && result.prevId) {
    return;
  }
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    searchNode(node[keys[i]], result, depth + 1);
  }
}
