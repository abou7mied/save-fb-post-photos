$.ajaxTransport('+binary', (options, originalOptions, jqXHR) => {
  // check for conditions and support for blob / arraybuffer response type
  if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob))))) {
    return {
      // create new XMLHttpRequest
      send(headers, callback) {
        // setup all variables
        const xhr = new XMLHttpRequest();


        const url = options.url;


        const type = options.type;


        const async = options.async || true;

        // blob or arraybuffer. Default is blob

        const dataType = options.responseType || 'blob';


        const data = options.data || null;


        const username = options.username || null;


        const password = options.password || null;

        xhr.addEventListener('load', () => {
          const data = {};
          data[options.dataType] = xhr.response;
          // make callback and send data
          callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
        });

        xhr.open(type, url, async, username, password);

        // setup custom headers
        for (const i in headers) {
          xhr.setRequestHeader(i, headers[i]);
        }

        xhr.responseType = dataType;
        xhr.send(data);
      },
      abort() {
        jqXHR.abort();
      },
    };
  }
});


function base64ArrayBuffer(arrayBuffer) {
  let base64 = '';
  const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  const bytes = new Uint8Array(arrayBuffer);
  const { byteLength } = bytes;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a;
  let b;
  let c;
  let
    d;
  let chunk;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i += 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += `${encodings[a] + encodings[b]}==`;
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += `${encodings[a] + encodings[b] + encodings[c]}=`;
  }

  return base64;
}

function rotateBase64Image(base64data, givenDegrees, callback) {
  const degrees = givenDegrees % 360;
  if (degrees % 90 !== 0 || degrees === 0) {
    callback(base64data);
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const image = new Image();
  image.src = base64data;
  image.onload = function () {
    if (degrees === 180) {
      canvas.width = image.width;
      canvas.height = image.height;
    } else {
      canvas.width = image.height;
      canvas.height = image.width;
    }
    ctx.rotate(degrees * Math.PI / 180);
    if (degrees === 90) {
      ctx.translate(0, -canvas.width);
    } else if (degrees === 180) {
      ctx.translate(-canvas.width, -canvas.height);
    } else if (degrees === 270) {
      ctx.translate(-canvas.height, 0);
    }
    ctx.drawImage(image, 0, 0);
    callback(canvas.toDataURL());
  };
}

export { base64ArrayBuffer, rotateBase64Image };
