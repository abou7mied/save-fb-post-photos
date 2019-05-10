chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
    for (let i = 0; i < details.requestHeaders.length; i++) {
      if (details.requestHeaders[i].name === 'Origin') {
        details.requestHeaders[i].value = 'https://www.facebook.com';
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ['https://www.facebook.com/ajax/photos/snowlift/menu*'] },
  ['blocking', 'requestHeaders'],
);
