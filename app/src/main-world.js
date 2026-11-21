// Runs in the page's MAIN world (see manifest). Facebook's module system is
// only reachable from here; the isolated-world content script asks for the
// GraphQL tokens over window.postMessage (CustomEvent detail does not cross
// Chrome's world boundary).
//
// docId & providedVariables: read live from CometPhotoRootContentQuery$Parameters
// (falling back to CometPhotoRootContentQuery_facebookRelayOperation for docId).
// Facebook's Relay queries require runtime __relay_internal__pv__* provided
// variables whose values are resolved via each provider's .get() method.
// dtsg: the fb_dtsg CSRF token required by /api/graphql/ when logged in.
// lsd: the LSD token sent via X-FB-LSD / lsd parameter.
//
// Facebook's require() is accessed as window.require so webpack does not
// rewrite the call into its own module resolution.

(function main() {
  const PARAMS_MODULE = 'CometPhotoRootContentQuery$Parameters';
  const OPERATION_MODULE = 'CometPhotoRootContentQuery_facebookRelayOperation';
  const fbRequire = () => window.require;

  function getTokenFromModule(moduleName) {
    try {
      const data = fbRequire()(moduleName);
      if (data && data.token) {
        return data.token;
      }
    } catch (error) {
      // fall through
    }
    return null;
  }

  function evalProvidedVariables(pvDefs) {
    const provided = {};
    if (!pvDefs || typeof pvDefs !== 'object') {
      return provided;
    }
    const entries = Object.entries(pvDefs);
    for (let i = 0; i < entries.length; i++) {
      const key = entries[i][0];
      const provider = entries[i][1];
      try {
        if (provider && typeof provider.get === 'function') {
          provided[key] = provider.get();
        } else if (typeof provider === 'function') {
          provided[key] = provider();
        } else if (provider !== undefined) {
          provided[key] = provider;
        }
      } catch (error) {
        // Ignore a single failing provider so the remaining ones still resolve.
      }
    }
    return provided;
  }

  function applyParamsModule(tokens, paramsMod) {
    if (paramsMod && paramsMod.params) {
      if (paramsMod.params.id) {
        tokens.docId = String(paramsMod.params.id);
      }
      tokens.providedVariables = evalProvidedVariables(paramsMod.params.providedVariables);
    }
  }

  function readDocIdFallback() {
    try {
      const op = fbRequire()(OPERATION_MODULE);
      if (op) {
        return String(op);
      }
    } catch (error) {
      // fall through
    }
    return null;
  }

  function resolveTokens(callback) {
    const tokens = {
      docId: null,
      dtsg: getTokenFromModule('DTSGInitialData'),
      lsd: getTokenFromModule('LSD'),
      providedVariables: {},
    };

    try {
      const paramsMod = fbRequire()(PARAMS_MODULE);
      applyParamsModule(tokens, paramsMod);
      if (tokens.docId) {
        callback(tokens);
        return;
      }
    } catch (error) {
      // Module not loaded yet; load it through Facebook's bootloader.
    }

    try {
      fbRequire()('Bootloader').loadModules(
        [PARAMS_MODULE],
        (paramsMod) => {
          applyParamsModule(tokens, paramsMod);
          if (!tokens.docId) {
            tokens.docId = readDocIdFallback();
          }
          if (tokens.docId) {
            callback(tokens);
            return;
          }
          try {
            fbRequire()('Bootloader').loadModules([OPERATION_MODULE], (docId) => {
              tokens.docId = docId ? String(docId) : null;
              callback(tokens);
            }, 'sfpp');
          } catch (opError) {
            callback(tokens);
          }
        },
        'sfpp',
      );
      return;
    } catch (bootError) {
      tokens.docId = readDocIdFallback();
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
