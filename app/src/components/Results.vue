<template lang="pug">
  #results(v-show="visible")
    .overall
    .wrapper
      .developed-by
        a(href="https://www.facebook.com/abou7mied" target="_blank")
          svg(width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg")
            path(d="M22.676 0H1.324C.593 0 0 .593 0 1.324v21.352C0 23.408.593 24 1.324 24h11.494v-9.294H9.689v-3.621h3.129V8.41c0-3.099 1.894-4.785 4.659-4.785 1.325 0 2.464.097 2.796.141v3.24h-1.921c-1.5 0-1.792.721-1.792 1.771v2.311h3.584l-.465 3.63H16.56V24h6.115c.733 0 1.325-.592 1.325-1.324V1.324C24 .593 23.408 0 22.676 0")
        a(href="https://www.github.com/abou7mied" target="_blank")
          svg(width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg")
            path(d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12")
      .scroll-view
        .buttons
          .left-side
            div
              label File Name:
              input#filename(type="text", v-model="filename")
            div
              div
                input(id="add-post-link", type="checkbox", v-model="addLinkEnabled")
                label(for="add-post-link") Add The Post Link
              div
                input(id="add-text", type="checkbox", v-model="addTextEnabled")
                label(for="add-text") Add The Post Caption (No Arabic support yet)
                textarea(v-show="addTextEnabled" rows="3" v-model="text")
          .right-side
            button(@click="savePDF" :disabled="working||preparing") Save PDF
            button(@click="saveZIP" :disabled="working||preparing") Save ZIP
            button.close(@click="close") Close
            span.progress(v-if="working") {{working}}
        .images
          ul
            div(v-if="preparing")
              | Preparing ...
            draggable(v-model="images")
              li(v-for="(image, i) in images" :class="{ignored: image.ignored}")
                .org-order(:class="{green: image.ignored}" @click="toggleIgnored(image)")
                  span.text {{image.name}}
                  span.button {{image.ignored?'+':'X'}}
                .thumb(:style="{'width': image.width&&image.width+'px', 'height': image.height&&image.height+'px'}")
                  img(:id="'image-'+i" height="350" :src="image.url" :style="{'transform': 'rotate('+image.degree+'deg)'}")
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
      margin: 50px;
      border-radius: 10px;
      background-color: #eeeeee;
      overflow: hidden;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;

      .scroll-view {
        overflow-y: scroll;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 30px;
      }

    }

    .developed-by {
      position: absolute;
      font-size: 10px;
      font-style: italic;
      bottom: 5px;
      left: 10px;

      svg {
        margin: 0 2px;
      }
    }

    .buttons {
      background-color: #fff;
      padding: 10px 20px 13px;
      display: flex;
      justify-content: space-between;

      .left-side {
        position: relative;

        * {
          vertical-align: middle;
        }

        > div {
          display: inline-block;
        }

      }

      .right-side {
        position: relative;

        .progress {
          position: absolute;
          right: 0;
          bottom: -8px;
          font-size: 13px;
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
      font-size: 12px;
      padding: 8px;
      position: absolute;
      top: 0;
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

        &.ignored {
          opacity: 0.5;
        }

        .org-order {
          cursor: pointer;
          width: 1em;
          height: 1em;
          position: absolute;
          line-height: 1em;
          font-size: 1em;
          top: 0;
          right: 10px;
          padding: 2px;
          border-radius: 50%;
          z-index: 30;
          background-color: #2e305b;
          color: white;

          span {
            font-size: 12px;
            line-height: 12px;
          }

          .button {
            display: none;
          }

          &:hover {
            background-color: #d62424;

            .button {
              display: inline-block;
            }

            .text {
              display: none;
            }

          }

          &.green:hover {
            background-color: #007a1a;
          }


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

  import async from 'async';
  import draggable from 'vuedraggable';
  import pdfMake from 'pdfmake/build/pdfmake.min.js';
  import { A4 } from 'pdfmake/src/standardPageSizes';
  import pdfFonts from '../vfs_fonts.js';
  import fileSaver from 'file-saver';
  import JSZip from 'jszip';
  import { base64ArrayBuffer, rotateBase64Image } from '../helpers';
  import sanitize from 'sanitize-filename';

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
    name: 'results',
    components: {
      draggable,
    },
    data() {
      return {
        filename: '',
        addTextEnabled: false,
        addLinkEnabled: true,
        text: '',
        postLink: '',
        pageBreak: true,
        visible: false,
        preparing: false,
        workingOn: -1,
        images: []
      };
    },
    computed: {
      working() {
        if (this.workingOn === -1) {
          return;
        }
        return `Processing: ${this.workingOn}/${this.images.length}`;
      },
      finalFileName() {
        return sanitize((this.filename || document.title).replace(/\./g, ''));
      }
    },
    methods: {
      init({ text, postLink }) {
        this.visible = true;
        this.preparing = true;
        this.images = [];
        this.text = text ? text.trim() : '';
        this.postLink = postLink || '';
        this.filename = this.text.split(/\s+/g)
          .slice(0, 10)
          .join(' ');
        this.addTextEnabled = !!this.text;
      },
      getImages(callback) {
        this.workingOn = 1;
        async.map(this.images.filter(image => !image.ignored), (item, next) => {
          async.waterfall([
            (next) => {
              console.log('item.url', item.url);
              $.ajax({
                url: item.url,
                type: 'GET',
                dataType: 'binary',
                responseType: 'arraybuffer',
                processData: false,
                success: (result) => next(null, base64ArrayBuffer(result)),
              });
            },
            (base64, next) => {
              this.workingOn++;
              base64 = 'data:image/jpeg;base64,' + base64;
              if (item.degree > 0) {
                rotateBase64Image(base64, item.degree, newBase64 => next(null, newBase64));
              } else {
                next(null, base64);
              }
            },
            (base64, next) => {
              const i = new Image();
              i.onload = () => {
                const calculateImageData = this.calculateImageData(i.width, i.height);
                next(null, Object.assign(calculateImageData, { data: base64 }));
              };
              i.src = base64;
            }
          ], (err, base64) => next(null, base64));

        }, (err, results) => {
          this.workingOn = -1;
          callback(err, results);
        });

      },
      calculateImageData(width, height) {
        console.log('width', width);
        console.log('height', height);

        const widthIsBigger = width > height;
        const results = {
          width,
          height
        };
        if (widthIsBigger) {
          results.width = A4[0];
          const scale = results.width / width;
          results.height = this.fixNumber(height * scale);
        } else {
          results.height = A4[1];
          const scale = results.height / height;
          results.width = this.fixNumber(width * scale);
        }
        return Object.assign(results, {
          margin: [
            this.fixNumber((A4[0] - results.width) / 2),
            this.fixNumber((A4[1] - results.height) / 2),
          ]
        });
      },
      fixNumber(number) {
        return +(number.toFixed(2));
      },
      savePDF() {
        let mapped = [];
        const text = [];
        if (this.addTextEnabled && this.text) {
          text.push({ text: this.text + '\n' });
        }
        if (this.addLinkEnabled) {
          text.push({
            text: 'Post Link',
            link: this.postLink,
            decoration: 'underline',
            fontSize: 15,
            color: '#0366d6'
          });
        }
        if (text.length) {
          mapped.push({
            text: text,
            margin: [40, 40],
            pageBreak: 'after'
          });
        }

        this.getImages((err, results) => {
          mapped = mapped.concat(results.map((item, i) => Object.assign(item, {
            image: item.data,
            pageBreak: i !== results.length - 1 && 'after',
          })));
          let info = mapped.map(i => Object.assign({}, i, {
            image: null,
            data: null
          }));
          console.log('JSON.stringify(info)', JSON.stringify(info));
          pdfMake.createPdf({
            pageSize: 'A4',
            pageMargins: [0, 0, 0, 0],
            defaultStyle: {
              font: 'defaultFont'
            },
            content: mapped,
          })
            .download(this.finalFileName);
        });

      },
      saveZIP() {

        this.getImages((err, results) => {
          let zip = new JSZip();

          let text = this.addTextEnabled && this.text;
          if (text || this.addLinkEnabled) {
            if (this.addLinkEnabled) {
              text = (text || '') + '\n\nLink:\n' + this.postLink;
            }
            zip.file('Caption.txt', text);
          }
          results.forEach((item, i) => {
            let { data } = item;
            let ext = data.indexOf('image/png') !== -1 ? 'png' : 'jpeg';
            data = data.replace(`data:image/${ext};base64,`, '');
            zip.file(`${i + 1}.${ext}`, data, { base64: true });
          });
          zip.generateAsync({ type: 'blob' })
            .then(content => fileSaver.saveAs(content, this.finalFileName + '.zip'));
        });
      },
      close() {
        this.visible = false;
      },
      setImages(urls) {
        this.images = urls.map((url, index) => {
          return {
            name: index + 1,
            ignored: false,
            degree: 0,
            url,
            height: 350,
          };
        });
      },
      rotate(i, toRight) {
        let image = this.images[i];
        image.degree += ((toRight ? 1 : -1) * (90)) + 360;
        image.degree %= 360;
        image.width = (image.degree === 90 || image.degree === 270) ? 350 : undefined;
        image.height = image.width ? $('#image-' + i)
          .width() : 350;
      },
      toggleIgnored(image) {
        image.ignored = !image.ignored;
      }
    }

  }
</script>
