export const getFormattedChunkGroup = ({ chunks, manifest }) =>
  chunks.reduce(
    (chunksGroupAcc, chunk) => {
      chunk.files.forEach((file) => {
        const isJS = file.endsWith('.js');
        const isCSS = file.endsWith('.css');

        if (isJS || isCSS) {
          const filePath = manifest.getPublicPath(file);

          if (isJS) {
            chunksGroupAcc.js.push(filePath);
          } else {
            chunksGroupAcc.css.push(filePath);
          }
        }
      });

      return chunksGroupAcc;
    },
    { js: [], css: [] },
  );
