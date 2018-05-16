import {app} from "./app";

function ready() {
  console.log("ready");
  app.$mount('#results');

  let links = [];

  app.visible = true;
  app.images = links.map((url, index) => {
    return {
      name: index + 1,
      degree: 0,
      url,
    }
  });

}

$(document).ready(() => ready());