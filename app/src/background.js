// chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
//   // console.log('details', details);
//   for (let i = 0; i < details.requestHeaders.length; i++) {
//     if (details.requestHeaders[i].name === 'Origin') {
//       details.requestHeaders[i].value = 'https://www.facebook.com';
//       break;
//     }
//   }
//   return { requestHeaders: details.requestHeaders };
// // }, { urls: ['https://www.facebook.com/*'] }, ['blocking', 'requestHeaders']);
// }, { urls: ['https://www.facebook.com/*'] }, ['blocking', 'requestHeaders']);
//
//
// chrome.webRequest.onCompleted.addListener(function (details) {
//   console.log('onCompleted details', details);
// }, { urls: ['https://www.facebook.com/*'] });
// // }, { urls: ['https://static.xx.fbcdn.net/rsrc.php*'] });
// //
