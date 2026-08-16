import app from './app';
import getPhotoData from './getPhotoData';

// Photo links keep these URL shapes even as Facebook's markup changes.
const PHOTO_ANCHOR_SELECTOR = [
  'a[href*="/photo/?"]',
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

function init() {
  const results = document.createElement('div');
  document.body.appendChild(results);
  app.$mount(results);

  detectPosts();
  setInterval(detectPosts, 1500);
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
  // Comments are nested articles labelled "Comment by ..." (localized).
  return !!(label && /comment|تعليق|رد/i.test(label));
}

function findPostContainer(anchor) {
  // [data-virtualized] wraps each feed unit in the current UI; aria-posinset
  // and role=article cover older layouts; role=dialog covers a post opened as
  // a popup over the feed. role=main is only safe on permalink pages — on the
  // feed it spans every post at once.
  const container = anchor.closest('div[aria-posinset]')
    || anchor.closest('[data-virtualized]')
    || anchor.closest('[role="article"]')
    || anchor.closest('[role="dialog"]');
  if (container) {
    return container;
  }
  if (window.location.pathname !== '/') {
    return anchor.closest('div[role="main"]');
  }
  return null;
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
  button.textContent = '⇩ Save photos';
  button.setAttribute('role', 'button');
  button.style.cssText = [
    'position:absolute',
    'top:10px',
    'right:80px',
    'z-index:1000',
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
  if (!post.style.position) {
    post.style.position = 'relative';
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

  const ids = photos.map(photo => photo.photoId);

  // The collage preview only links the first few photos; follow the media
  // set from the last known photo to discover the rest ("+N more").
  // Only walk multi-photo sets so a single photo inside a big album doesn't
  // enumerate the whole album.
  if (setToken && (ids.length > 1 || setToken.indexOf('pcb.') === 0)) {
    const seen = new Set(ids);
    let cursor = ids[ids.length - 1];
    let steps = 0;
    while (cursor && steps < MAX_SET_WALK) {
      steps += 1;
      let data;
      try {
        data = await getPhotoData(cursor, setToken); // eslint-disable-line no-await-in-loop
      } catch (error) {
        break;
      }
      if (!data.nextId || seen.has(data.nextId)) {
        break;
      }
      seen.add(data.nextId);
      ids.push(data.nextId);
      cursor = data.nextId;
    }
  }

  const urls = [];
  await Promise.all(ids.map((id, index) => getPhotoData(id, setToken)
    .then((data) => {
      urls[index] = data.uri;
    })
    .catch(() => {
      urls[index] = null;
    })));

  const finalUrls = urls.filter(Boolean);
  if (!finalUrls.length) {
    throw new Error('Could not resolve any photo URLs. Facebook may have changed its page format.');
  }
  app.setImages(finalUrls);
}

init();
