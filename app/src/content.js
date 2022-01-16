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

  console.log('dtsg', dtsg);

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

  // const a = galleryWrapperNode.find('a[rel=theater]');
  const a = galleryWrapperNode.find('a[role="link"]');

  let mapped = a.toArray()
    .map((item) => {
      if (item.href.indexOf('/posts/') !== -1 || item.href.indexOf('/photos/') !== -1) {
        const paths = item.href.split('/');
        photoSetId = paths[paths.length - 3];
        return paths[paths.length - 2];
      }
      const photoUrlParams = parsePhotoUrlParams(item.search);
      console.log('photoUrlParams', photoUrlParams);
      photoSetId = photoUrlParams.set;
      return photoUrlParams.fbid;
    });

  console.log('mapped', mapped);
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
  // The time Node e.g. "2h"
  const timeNode = document.querySelectorAll('span.j1lvzwm4.stjgntxs.ni8dbmo4.q9uorilb.gpro0wi8');
  console.log('timeNode', timeNode);
  timeNode.forEach((node) => {
    const closest = $(node)
      .closest('.j83agx80.l9j0dhe7.k4urcfbm');

    console.log('closest', closest);

    const textNode = closest.find('.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.b0tq1wua.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d9wwppkn.fe6kdd0r.mau55g9w.c8b282yb.hrzyx87i.jq4qci2q.a3bd9o3v.b1v8xokw.oo9gr5id.hzawbc8m')[0];
    console.log('textNode', textNode);

    if (!textNode) {
      return;
    }

    const text = textNode && (textNode.innerText || textNode.textContent);

    // const textAtRight = closest.find('.userContent p')
    //   .eq(0)
    //   .css('text-align') === 'right';
    const textAtRight = false;

    const galleryWrapperNode = $($(textNode.closest('.ecm0bbzt.hv4rvrfc.ihqw7lf3.dati1w0a'))
      .parent())
      .next();

    const image = galleryWrapperNode.find('img');
    // const galleryWrapperNode = closest.find('.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.g5gj957u.rj1gh0hx.buofh1pr.hpfvmrgz.i1fnvgqd.gs1a9yip.owycx6da.btwxx1t3.jb3vyjys');

    console.log('galleryWrapperNode', galleryWrapperNode);

    const postLink = $(node)
      .closest('a')
      .attr('href');

    console.log('node', $(node));
    console.log('link', $(node)
      .closest('a'));
    console.log('link', $(node)
      .closest('a')
      .attr('href'));

    // if (closest && galleryWrapperNode.length) {
    if (closest && image.length) {
      const aNodeParent = $('<span class="download"></span>');
      const aNode = $('<a>Download</a>');
      aNodeParent.append(' ');
      aNodeParent.append(aNode);
      aNodeParent.click(() => download({
        galleryWrapperNode,
        text,
        postLink,
        textAtRight,
      }));
      const targetToAddButton = $($(node)
        .closest('a')
        .parent());
      targetToAddButton
        .find('.download')
        .remove();
      targetToAddButton
        .append(aNodeParent);
    }
  });
}

init();

async function getNextOf(id, set) {
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
  console.log('getPhotoData results', results);
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
        console.log('docId', docId);
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
