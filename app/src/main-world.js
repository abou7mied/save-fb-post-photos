// Runs in the page's MAIN world (see manifest). Facebook's module system is
// only reachable from here; the isolated-world content script asks for the
// GraphQL tokens over window.postMessage (CustomEvent detail does not cross
// Chrome's world boundary).
//
// docId: the current doc_id of CometPhotoRootContentQuery (rotates with FB
// releases, so it must be read from the live page rather than hardcoded).
// dtsg: the fb_dtsg CSRF token required by /api/graphql/.
//
// Facebook's require() is accessed as window.require so webpack does not
// rewrite the call into its own module resolution.

(function main() {
  const OPERATION = 'CometPhotoRootContentQuery_facebookRelayOperation';
  const fbRequire = () => window.require;

  function getDtsg() {
    try {
      const data = fbRequire()('DTSGInitialData');
      if (data && data.token) {
        return data.token;
      }
    } catch (error) {
      // fall through
    }
    return null;
  }

  function resolveTokens(callback) {
    const tokens = {
      docId: null,
      dtsg: getDtsg(),
    };
    try {
      tokens.docId = fbRequire()(OPERATION);
    } catch (error) {
      // Module not loaded yet; try to load it through Facebook's bootloader.
      try {
        fbRequire()('Bootloader').loadModules([OPERATION], (docId) => {
          tokens.docId = docId;
          callback(tokens);
        }, 'sfpp');
        return;
      } catch (bootError) {
        // fall through
      }
    }
    callback(tokens);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'sfpp-request-tokens') {
      return;
    }
    resolveTokens((tokens) => {
      window.postMessage({ type: 'sfpp-tokens', tokens }, window.location.origin);
    });
  });
}());
