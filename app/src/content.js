import { app } from './app';
import async from 'async';
import getPhotoData from './getPhotoData';

const urls = [];
const photosIds = [];
let prevScrollHeight;
const getUrlPromises = [];
let docId;
const dtsg = dtsgMatcher();
let photoSetId;

function clear() {
  photosIds.splice(0);
  urls.splice(0);
}

function init() {
  const results = $('<div id="results"></div>');
  $('body')
    .append(results);
  app.$mount(results[0]);
  clear();

  loadScriptAndExtractDocId();

  setInterval(() => {
    if (prevScrollHeight !== document.documentElement.scrollHeight) {
      prevScrollHeight = document.documentElement.scrollHeight;
      detectTimeNodes();
    }
  }, 1500);
}

function getUrlsOf(array) {
  for (let i = 0; i < array.length; i++) {
    addPhotoId(array[i], i);
  }
}

function parsePhotoUrlParams(search) {
  const query = search.substr(1);
  const result = {};
  query.split('&')
    .forEach((part) => {
      const item = part.split('=');
      result[item[0]] = decodeURIComponent(item[1]);
    });
  return result;
}

function download({
  galleryWrapperNode,
  text,
  postLink,
  textAtRight,
}) {
  clear();
  app.init({
    text,
    textAtRight,
    postLink: `https://www.facebook.com${postLink}`,
  });

  const a = galleryWrapperNode.find('a[role="link"]');

  let mapped = a.toArray()
    .map((item) => {
      if (item.href.indexOf('/posts/') !== -1 || item.href.indexOf('/photos/') !== -1) {
        const paths = item.href.split('/');
        photoSetId = paths[paths.length - 3];
        return paths[paths.length - 2];
      }
      const photoUrlParams = parsePhotoUrlParams(item.search);
      photoSetId = photoUrlParams.set;
      return photoUrlParams.fbid;
    });

  getUrlsOf(mapped);

  async.series([
    (next) => {
      async.doDuring(
        async (callback) => {
          const newId = await getNextOf(mapped[mapped.length - 1], photoSetId);
          const reachedTheEnd = !newId || mapped.find(n => n.toString() === newId);
          if (newId) {
            mapped.push(newId);
            mapped = mapped.filter((item, pos) => mapped.indexOf(item) === pos);
          }
          getUrlsOf(mapped);
          callback(null, reachedTheEnd);
        },
        (reachedTheEnd, callback) => {
          callback(null, !reachedTheEnd);
        },
        () => {
          next();
        },
      );
    },
    async () => {
      await Promise.all(getUrlPromises);
      app.setImages(urls);
    },
  ]);
}

function detectTimeNodes() {
  const timeNode = $('[title*=\'Shared with\']');
  timeNode.each((i, x) => {
    const timeWrapper = $(x).closest('div');
    const postWrapper = timeWrapper.parents().eq(4);

    let firstImageNode;

    const extractCorrectImage = (items) => {
      if (items.length && !$(items[0]).closest('li').length) {
        firstImageNode = items[0];
      }
      return firstImageNode;
    };

    const photoA = postWrapper.find('a[href*=\'https://www.facebook.com/photo/\']');
    const photoB = postWrapper.find('a[href*=\'/photos/\']');

    extractCorrectImage(photoA);
    if (!firstImageNode) {
      extractCorrectImage(photoB);
    }

    if (!firstImageNode) {
      return;
    }

    const galleryWrapperNode = $(firstImageNode).parents().eq(1);
    const textNode = postWrapper.find('[data-ad-comet-preview="message"]')[0];
    const text = textNode && (textNode.innerText || textNode.textContent);

    const textAtRight = false; // TODO: to be implemented
    const postLink = ''; // TODO: to be implemented

    const aNodeParent = $('<span class="download"></span>');
    const aNode = $('<a href=\'#\'>Download</a>');
    aNodeParent.append(' ');
    aNodeParent.append(aNode);

    aNodeParent.click(() => download({
      galleryWrapperNode,
      text,
      postLink,
      textAtRight,
    }));
    $(timeWrapper)
      .find('.download')
      .remove();
    $(timeWrapper)
      .find('span:eq(0)')
      .append(aNodeParent);
  });
}

init();

async function getNextOf(id) {
  const results = await getPhotoData({
    fb_dtsg: dtsg,
    docId,
    photoId: id,
    photoSetId,
  });
  return results.nextImageId;
}


async function getOriginalUrl(id) {
  const results = await getPhotoData({
    fb_dtsg: dtsg,
    docId,
    photoId: id,
    photoSetId,
  });
  return results.image.uri;
}


function addPhotoId(id, i) {
  id += '';
  if (photosIds.indexOf(id) !== -1) {
    return;
  }
  photosIds.push(id);
  getUrlPromises.push(getOriginalUrl(id)
    .then(url => urls[i] = url));
}

function loadScriptAndExtractDocId() {
  $.ajax({
    url: 'https://static.xx.fbcdn.net/rsrc.php/v3/yi/r/qZ-coEUYuSR.js',
    method: 'GET',
    dataType: 'text',
  })
    .done((response) => {
      const match = response.match(/CometPhotoRootContentQuery_facebookRelayOperation.*?e\.exports="(.*?)"/i);
      if (match) {
        docId = match[1];
      }
    });
}


function findScriptTextIncludes(matcher) {
  return $('script')
    .toArray()
    .find(script => matcher(script.text)).text;
}

function dtsgMatcher() {
  const scriptText = findScriptTextIncludes(text => text.match('DTSGInitialData'));
  const match = scriptText.match(/DTSGInitialData.*?"token":"(.*?)"/i);
  return match[1];
}
