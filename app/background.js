// MV3 service worker. Fetches image bytes on behalf of the content script:
// host_permissions grant it CORS-free access to the fbcdn.net image CDN,
// which the content script itself does not get in Manifest V3.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'sfpp-fetch-image') {
    return undefined;
  }
  fetch(message.url, { credentials: 'omit' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return response.arrayBuffer().then((buffer) => {
        sendResponse({
          ok: true,
          contentType,
          base64: arrayBufferToBase64(buffer),
        });
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: String(error) });
    });
  return true; // keep the message channel open for the async response
});

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
