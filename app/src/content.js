import app from './app';
import getPhotoData from './getPhotoData';
import walkMediaSet from './walkMediaSet';

// Photo links keep these URL shapes even as Facebook's markup changes.
const PHOTO_ANCHOR_SELECTOR = [
  'a[href*="/photo/?"]',
  'a[href*="/photo?"]',
  'a[href*="/photo.php?"]',
  'a[href*="/photos/"]',
].join(',');

const POST_MESSAGE_SELECTOR = [
  '[data-ad-comet-preview="message"]',
  '[data-ad-preview="message"]',
  '[data-ad-rendering-role="story_message"]',
].join(',');

// Walking a media set is capped so a single photo that belongs to a huge
// album can't trigger hundreds of requests.
const MAX_SET_WALK = 300;

function safeDetectPosts() {
  try {
    detectPosts();
  } catch (error) {
    // Keep periodic detection alive even if Facebook mutates DOM mid-scan.
  }
}

function init() {
  const results = document.createElement('div');
  document.body.appendChild(results);
  app.$mount(results);

  setInterval(safeDetectPosts, 1500);
  if (typeof MutationObserver !== 'undefined') {
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (!debounceTimer) {
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          safeDetectPosts();
        }, 300);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  safeDetectPosts();
}

function parsePhotoAnchor(anchor) {
  let url;
  try {
    url = new URL(anchor.href, window.location.origin);
  } catch (error) {
    return null;
  }
  const fbid = url.searchParams.get('fbid');
  if (fbid) {
    return {
      photoId: fbid,
      setToken: url.searchParams.get('set'),
    };
  }
  // Old-style links: /{page}/photos/{set}/{photoId}/
  const match = url.pathname.match(/\/photos\/([^/]+)\/(\d+)/);
  if (match) {
    return {
      photoId: match[2],
      setToken: match[1],
    };
  }
  return null;
}

function isInsideComment(anchor) {
  const article = anchor.closest('[role="article"]');
  const label = article && article.getAttribute('aria-label');
  // Comments are nested articles labelled "Comment by ..." / "تعليق من ..." (localized).
  // Match standalone words so Arabic page/user names containing "رد" (e.g. مراد/ورد) are not skipped.
  return !!(label && /(^|\s)(comment|reply|تعليق|رد)(\s|$)/i.test(label));
}

function findPostContainer(anchor) {
  // Prefer the innermost post article/unit over outer page wrappers.
  let container = anchor.closest('div[aria-posinset]')
    || anchor.closest('[role="article"]')
    || anchor.closest('[data-virtualized]')
    || anchor.closest('[role="dialog"]');
  if (!container && window.location.pathname !== '/') {
    container = anchor.closest('div[role="main"]');
  }
  // An element with display:contents cannot establish a positioning context for
  // an absolute button; walk up to the first real layout box.
  while (container && container.parentElement) {
    try {
      if (window.getComputedStyle(container).display !== 'contents') {
        break;
      }
    } catch (error) {
      break;
    }
    container = container.parentElement;
  }
  return container || null;
}

function detectPosts() {
  const anchors = document.querySelectorAll(PHOTO_ANCHOR_SELECTOR);
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    if (parsePhotoAnchor(anchor) && !isInsideComment(anchor)) {
      const post = findPostContainer(anchor);
      if (post && !post.querySelector('.sfpp-download')) {
        addDownloadButton(post);
      }
    }
  }
}

function addDownloadButton(post) {
  const button = document.createElement('div');
  button.className = 'sfpp-download';
  button.textContent = '⇩ Download photos';
  button.setAttribute('role', 'button');
  const topOffset = post.getAttribute('role') === 'main' ? '70px' : '10px';
  button.style.cssText = [
    'position:absolute',
    `top:${topOffset}`,
    'right:80px',
    'z-index:9999',
    'cursor:pointer',
    'background:#345fff',
    'color:#fff',
    'font-size:13px',
    'font-weight:bold',
    'font-family:Arial,sans-serif',
    'line-height:1',
    'padding:7px 12px',
    'border-radius:15px',
    'box-shadow:0 1px 3px rgba(0,0,0,0.35)',
    'user-select:none',
  ].join(';');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    startDownload(post)
      .catch((error) => {
        app.close();
        window.alert(`Save Post Photos: ${error && error.message ? error.message : error}`);
      });
  });
  try {
    if (window.getComputedStyle(post).position === 'static') {
      post.style.position = 'relative';
    }
  } catch (error) {
    if (!post.style.position) {
      post.style.position = 'relative';
    }
  }
  post.appendChild(button);
}

function collectPostPhotos(post) {
  const anchors = post.querySelectorAll(PHOTO_ANCHOR_SELECTOR);
  const photos = [];
  const seen = {};
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    if (!isInsideComment(anchor)) {
      const parsed = parsePhotoAnchor(anchor);
      if (parsed && !seen[parsed.photoId]) {
        seen[parsed.photoId] = true;
        photos.push(parsed);
      }
    }
  }
  return photos;
}

async function startDownload(post) {
  const photos = collectPostPhotos(post);
  if (!photos.length) {
    throw new Error('No photos found in this post.');
  }

  const textNode = post.querySelector(POST_MESSAGE_SELECTOR);
  const text = textNode ? (textNode.innerText || textNode.textContent) : '';
  const postLinkNode = post.querySelector('a[href*="/posts/"], a[href*="/permalink"], a[href*="story_fbid="]');
  const postLink = postLinkNode ? postLinkNode.href : window.location.href;

  app.init({
    text,
    postLink,
    textAtRight: false,
  });

  let setToken = null;
  for (let i = 0; i < photos.length; i++) {
    if (photos[i].setToken) {
      setToken = photos[i].setToken;
      break;
    }
  }

  const initialIds = photos.map(photo => photo.photoId);
  const ids = await walkMediaSet(initialIds, setToken, getPhotoData, MAX_SET_WALK);

  const urls = [];
  let firstError = null;
  await Promise.all(ids.map((id, index) => getPhotoData(id, setToken)
    .then((data) => {
      urls[index] = data.uri;
    })
    .catch((error) => {
      if (!firstError) {
        firstError = error;
      }
      urls[index] = null;
    })));

  const finalUrls = urls.filter(Boolean);
  if (!finalUrls.length) {
    const detail = firstError && firstError.message ? ` (${firstError.message})` : '';
    throw new Error(`Could not resolve any photo URLs. Facebook may have changed its page format.${detail}`);
  }
  app.setImages(finalUrls);
}

init();
