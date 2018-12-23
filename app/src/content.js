import {app} from "./app";
import async from "async";

let doneListener;
let workers = 0;
let urls = [];
let photosIds = [];
let prevScrollHeight;

function clear() {
  photosIds.splice(0);
  urls.splice(0);
  workers = 0;
}

function init() {
  let results = $('<div id="results"></div>');
  $("body").append(results);
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
  let query = search.substr(1);
  let result = {};
  query.split("&").forEach(function (part) {
    let item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

function download(_2a2q, text) {
  clear();
  app.init(text);

  let a = _2a2q.find("a[rel=theater]");
  let set;
  let mapped = a.toArray().map((item) => {
    if (item.href.indexOf("/posts/") !== -1 || item.href.indexOf("/photos/") !== -1) {
      let paths = item.href.split("/");
      set = paths[paths.length - 3];
      return paths[paths.length - 2];
    } else {
      let json = getJsonFromUrl(item.search);
      set = json.set;
      return json.fbid;
    }
  });

  getUrlsOf(mapped);
  async.series([
    (next) => {
      async.doDuring(
        callback => {
          getNextOf(mapped[mapped.length - 1], set, (err, newIds) => {
            let filtered = newIds.filter(n => mapped.indexOf(n) !== -1);
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
        }
      );
    },
    (next) => {
      if (workers) {
        doneListener = () => next();
      } else
        next();
    },
    () => {
      app.preparing = false;
      app.images = urls.map((url, index) => {
        return {
          name: index + 1,
          degree: 0,
          url,
        }
      });
    }
  ])

}

function detectTimeNodes() {

  const timeNode = $("._5u5j .fsm.fwn.fcg");
  timeNode.each((i, x) => {
    let closest = $(x).closest("._1dwg");
    let textNode = closest.find(".userContent")[0];
    let text = textNode.innerText || textNode.textContent;
    let _2a2q = closest.find("._2a2q");
    if (closest && _2a2q.length) {
      let aNodeParent = $('<span class="download"></span>');
      let aNode = $("<a href='#'>Download</a>");
      aNodeParent.append(" ");
      aNodeParent.append(aNode);
      aNodeParent.click(() => download(_2a2q, text));
      $(x).parent().find(".download").remove();
      $(x).parent().append(aNodeParent);
    }
  });

}

init();

function getNextOf(id, set, callback) {
  let data = {fbid: id + ""};
  if (set) {
    data.set = set;
  }
  const fb_dtsg_ag = $('html').html().match(/async_get_token"\s*:\s*"(.*?)"/)[1];
  console.log("fb_dtsg_ag", fb_dtsg_ag);
  $.ajax({
    url: "https://www.facebook.com/ajax/pagelet/generic.php/PhotoViewerInitPagelet?data=" +
      encodeURIComponent(JSON.stringify(data)) + "&__a=1&fb_dtsg_ag=" + encodeURIComponent(fb_dtsg_ag),
    type: "GET",
    dataType: "text",
    error: () => {
      callback(true);
    },
    success: (result) => {
      let myRegexp = /(?="addPhotoFbids")(.*?)(],\[\[)(.*?)(])/g;
      let match = myRegexp.exec(result);
      let ids = "[" + match[3] + "]";
      callback(null, JSON.parse(ids))
    },
  });
}


function getOriginalUrl(id, callback) {

  $.ajax({
    url: "https://www.facebook.com/ajax/photos/snowlift/menu/?fbid=" + id,
    type: "POST",
    data: {
      __a: "1",
      fb_dtsg: $("input[name=fb_dtsg]").val(),
    },
    dataType: "text",
    error: () => {
      --workers;
      callback(true);
    },
    success: (data) => {
      let matched = data.match(/"download_photo","href":"(.*?)"/);
      let finalResult;
      if (matched)
        finalResult = matched[1].replace(/\\/g, "");
      callback(!finalResult, finalResult);
    },
  })

}


function addPhotoId(id, i) {
  id += "";
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
