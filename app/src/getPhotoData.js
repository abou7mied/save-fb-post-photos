export default function getPhotoData(options) {
  const {
    fb_dtsg,
    docId,
    photoId,
    photoSetId,
  } = options;

  const variables = {
    isMediaset: true,
    nodeID: photoId,
    mediasetToken: photoSetId,
  };

  return new Promise((resolve, reject) => {
    $.ajax({
      url: 'https://www.facebook.com/api/graphql/',
      method: 'POST',
      timeout: 0,
      data: {
        fb_dtsg,
        variables: JSON.stringify(variables),
        doc_id: docId,
      },
      error: err => reject(err),
      success: (response) => {
        const lines = response.split('\n');
        let image;
        let nextImageId;
        for (const line of lines) {
          // $[7].data.nextMediaAfterNodeId
          const json = JSON.parse(line);
          if (json.data) {
            if (json.data.currMedia && json.data.currMedia.image) {
              image = json.data.currMedia.image;
            }
          }
          if (json.data.nextMediaAfterNodeId) {
            nextImageId = json.data.nextMediaAfterNodeId.id;
          }
        }
        resolve({
          image,
          nextImageId,
        });
      },
    });
  });
}
