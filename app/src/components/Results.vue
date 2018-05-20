<template lang="pug">
  #results(v-show="visible")
    .overall
    .wrapper
      .buttons
        .left-side
          label File Name:
          input#filename(type="text", v-model="filename")
          span
            input(id="add-text", type="checkbox", v-model="addTextEnabled")
            label(for="add-text") Add the text of the post (PDF doesn't support Arabic yet)
            textarea(v-show="addTextEnabled", v-model="text")
          span(v-show="addTextEnabled")
            input(id="page-break", type="checkbox", v-model="pageBreak")
            label(for="page-break") Page break
        .right-side
          button(@click="savePDF" :disabled="working||preparing") Save PDF
          button(@click="saveZIP" :disabled="working||preparing") Save ZIP
          button.close(@click="close") Close
          span(v-if="working") {{working}}
      .images
        ul
          div(v-if="preparing")
            | Preparing ...
          draggable(v-model="images")
            li(v-for="(image, i) in images")
              .org-order {{image.name}}
              .thumb
                img(height="350" :src="image.url" :style="{'transform': 'rotate('+image.degree+'deg)'}")
              .info
                span \#{{i+1}}
                span
                  | Rotate:
                  span.rotate(@click="rotate(i, false)") Left
                  |                                       /
                  span.rotate(@click="rotate(i, true)") Right
                span Degree: {{image.degree}}

</template>


<style scoped lang="scss">

  #results {
    z-index: 20000;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    overflow: hidden;
    .overall {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: #000;
      opacity: 0.3;
    }
    .wrapper {
      box-shadow: 0 1px 10px #161616;
      padding: 0;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: 50px;
      border-radius: 10px;
      background-color: #eeeeee;
      overflow: scroll;
    }
    .buttons {
      background-color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;

      .left-side {
        * {
          vertical-align: middle;
        }
      }
    }
    input, textarea {
      border: 1px solid #345fff;
    }

    #filename {
      width: 250px;
    }

    input, button, textarea {
      padding: 8px 15px;
      border-radius: 30px;
      font-size: 16px;
      margin: 10px 2px;
    }

    textarea {
      border-radius: 5px;
      margin: 0 10px;
    }

    button {
      border: none;
      color: white;
      background: #345fff;
      cursor: pointer;
      &:disabled {
        opacity: 0.6;
        cursor: default;
      }
      &.close {
        background-color: #d0000d;
      }
    }
    .images {
      margin: 15px 0;
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        text-align: center;
      }

      li {
        margin: 5px;
        display: inline-block;
        background: #fff;
        padding: 10px;
        position: relative;

        .org-order {
          width: 1em;
          height: 1em;
          position: absolute;
          font-size: 1.2em;
          top: 0;
          right: 10px;
          padding: 3px;
          border-radius: 50%;
          z-index: 30;
          background-color: #d62424;
          color: white;
        }

        .thumb {
          padding: 0;
          position: relative;
          overflow: hidden;
          max-width: 350px;
        }

        .info > span {
          padding: 0 5px;
        }

        span {
          font-size: 14px;
          &.rotate {
            color: #1c5fbd;
            cursor: pointer;
          }
        }
      }
    }
    .clear {
      clear: both;
    }
  }

</style>


<script>

  import async from "async";
  import draggable from 'vuedraggable'
  import pdfMake from "pdfmake/build/pdfmake.min.js";
  import pdfFonts from "../vfs_fonts.js";
  import fileSaver from "file-saver";
  import JSZip from "jszip";
  import {base64ArrayBuffer, rotateBase64Image} from "../helpers";
  import sanitize from "sanitize-filename";

  pdfMake.vfs = pdfFonts.pdfMake.vfs;

  pdfMake.fonts = {
    defaultFont: {
      normal: 'font.ttf',
      bold: 'font.ttf',
      italics: 'font.ttf',
      bolditalics: 'font.ttf'
    },
  };

  export default {
    name: "results",
    components: {
      draggable,
    },
    data() {
      return {
        filename: "",
        addTextEnabled: false,
        text: "Hello world ......",
        pageBreak: true,
        visible: false,
        preparing: false,
        workingOn: -1,
        images: []
      }
    },
    computed: {
      working() {
        if (this.workingOn === -1)
          return;
        return `Working: ${this.workingOn}/${this.images.length}`;
      },
      finalFileName() {
        return sanitize(this.filename || document.title);
      }
    },
    methods: {
      init(text) {
        this.visible = true;
        this.filename = document.title;
        this.preparing = true;
        this.images = [];
        this.text = text ? text.trim() : "";
        this.addTextEnabled = !!this.text;
      },
      getImages(callback) {

        this.workingOn = 1;
        async.map(this.images, (item, next) => {
          async.waterfall([
            (next) => {
              console.log("item.url", item.url);
              $.ajax({
                url: item.url,
                type: "GET",
                dataType: "binary",
                responseType: 'arraybuffer',
                processData: false,
                success: (result) => next(null, base64ArrayBuffer(result)),
              })
            },
            (base64, next) => {
              this.workingOn++;
              base64 = 'data:image/jpeg;base64,' + base64;
              if (item.degree > 0) {
                rotateBase64Image(base64, item.degree, newBase64 => next(null, newBase64));
              } else
                next(null, base64)
            }
          ], (err, base64) => next(null, base64));

        }, (err, results) => {
          this.workingOn = -1;
          callback(err, results);
        });

      },
      savePDF() {
        let mapped = [];
        if (this.addTextEnabled && this.text) {
          mapped.push({
            text: this.text,
            pageBreak: this.pageBreak ? "after" : null,
          });
        }

        this.getImages((err, results) => {
          mapped = mapped.concat(results.map((item) => ({
            image: item,
            fit: [510, 1000]
          })));
          pdfMake.createPdf({
            defaultStyle: {
              font: 'defaultFont'
            },
            content: mapped,
          }).download(this.finalFileName);
        });

      },
      saveZIP() {

        this.getImages((err, results) => {
          let zip = new JSZip();

          if (this.addTextEnabled && this.text) {
            zip.file("Text.txt", this.text);
          }

          results.forEach((item, i) => {
            let ext = item.indexOf("image/png") !== -1 ? "png" : "jpeg";
            item = item.replace(`data:image/${ext};base64,`, '');
            zip.file(`${i + 1}.${ext}`, item, {base64: true});
          });
          zip.generateAsync({type: "blob"}).then(content => fileSaver.saveAs(content, this.finalFileName + ".zip"));
        });
      },
      close() {
        this.visible = false;
      },
      rotate(i, toRight) {
        this.images[i].degree += ((toRight ? 1 : -1) * (90)) + 360;
        this.images[i].degree %= 360;
      }
    }

  }
</script>