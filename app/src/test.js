import {app} from "./app";
import urls from "./mockup/urls.json";

function ready() {
  app.setImages(urls);
  app.$mount('#results');
  app.visible = true;
}

$(document).ready(() => ready());
