import { app } from './app';
import async from 'async';

let doneListener;
let workers = 0;
const urls = [];
const photosIds = [];
let prevScrollHeight;

function clear() {
  photosIds.splice(0);
  urls.splice(0);
  workers = 0;
}

function init() {
  const results = $('<div id="results"></div>');
  $('body')
    .append(results);
  app.$mount(results[0]);
  clear();
  setInterval(() => {
    if (prevScrollHeight !== document.documentElement.scrollHeight) {
      prevScrollHeight = document.documentElement.scrollHeight;
      detectTimeNodes();
    }
  }, 2000);
}

function getUrlsOf(array) {
  for (let i = 0; i < array.length; i++) {
    addPhotoId(array[i], i);
  }
}

function getJsonFromUrl(search) {
  const query = search.substr(1);
  const result = {};
  query.split('&')
    .forEach((part) => {
      const item = part.split('=');
      result[item[0]] = decodeURIComponent(item[1]);
    });
  return result;
}

function download(_2a2q, text, postLink) {
  clear();
  app.init({
    text,
    postLink: `https://www.facebook.com${postLink}`,
  });

  const a = _2a2q.find('a[rel=theater]');
  let set;
  let mapped = a.toArray()
    .map((item) => {
      if (item.href.indexOf('/posts/') !== -1 || item.href.indexOf('/photos/') !== -1) {
        const paths = item.href.split('/');
        set = paths[paths.length - 3];
        return paths[paths.length - 2];
      }
      const json = getJsonFromUrl(item.search);
      set = json.set;
      return json.fbid;
    });

  getUrlsOf(mapped);
  async.series([
    (next) => {
      async.doDuring(
        (callback) => {
          getNextOf(mapped[mapped.length - 1], set, (err, newIds) => {
            const filtered = newIds.filter(n => mapped.indexOf(n) !== -1);
            mapped = mapped.concat(newIds);
            mapped = mapped.filter((item, pos) => mapped.indexOf(item) === pos);
            getUrlsOf(mapped);
            callback(null, filtered);
          });
        },
        (filtered, callback) => {
          callback(null, !filtered.length);
        },
        () => {
          next();
        },
      );
    },
    (next) => {
      if (workers) {
        doneListener = () => next();
      } else {
        next();
      }
    },
    () => {
      app.preparing = false;
      app.setImages(urls);
    },
  ]);
}

function detectTimeNodes() {
  const timeNode = $('._5u5j .fsm.fwn.fcg');
  timeNode.each((i, x) => {
    const closest = $(x)
      .closest('._1dwg');
    const textNode = closest.find('.userContent')[0];
    const text = textNode && (textNode.innerText || textNode.textContent);
    const _2a2q = closest.find('._2a2q');
    const postLink = closest.find('a._5pcq')
      .attr('href');
    if (closest && _2a2q.length) {
      const aNodeParent = $('<span class="download"></span>');
      const aNode = $('<a href=\'#\'>Download</a>');
      aNodeParent.append(' ');
      aNodeParent.append(aNode);
      aNodeParent.click(() => download(_2a2q, text, postLink));
      $(x)
        .parent()
        .find('.download')
        .remove();
      $(x)
        .parent()
        .append(aNodeParent);
    }
  });
}

init();

function getNextOf(id, set, callback) {
  const data = { fbid: `${id}` };
  if (set) {
    data.set = set;
  }
  const fbDtsgAg = $('html')
    .html()
    .match(/async_get_token"\s*:\s*"(.*?)"/)[1];
  $.ajax({
    url: `https://www.facebook.com/ajax/pagelet/generic.php/PhotoViewerInitPagelet?data=${
      encodeURIComponent(JSON.stringify(data))}&__a=1&fb_dtsg_ag=${encodeURIComponent(fbDtsgAg)}`,
    type: 'GET',
    dataType: 'text',
    error: () => {
      callback(true);
    },
    success: (result) => {
      const myRegexp = /(?="addPhotoFbids")(.*?)(],\[\[)(.*?)(])/g;
      const match = myRegexp.exec(result);
      const ids = `[${match[3]}]`;
      callback(null, JSON.parse(ids));
    },
  });
}


function getOriginalUrl(id, callback) {
  $.ajax({
    url: `https://www.facebook.com/ajax/photos/snowlift/menu/?fbid=${id}`,
    type: 'POST',
    data: {
      __a: '1',
      fb_dtsg: $('input[name=fb_dtsg]')
        .val(),
    },
    dataType: 'text',
    error: () => {
      --workers;
      callback(true);
    },
    success: (data) => {
      const matched = data.match(/"download_photo","href":"(.*?)"/);
      let finalResult;
      if (matched) finalResult = matched[1].replace(/\\/g, '');
      callback(!finalResult, finalResult);
    },
  });
}


function addPhotoId(id, i) {
  id += '';
  if (photosIds.indexOf(id) !== -1) {
    return;
  }

  photosIds.push(id);
  workers++;
  getOriginalUrl(id, (err, url) => {
    workers--;
    urls[i] = url;
    if (doneListener && !workers) {
      doneListener();
      doneListener = null;
    }
  });
}
