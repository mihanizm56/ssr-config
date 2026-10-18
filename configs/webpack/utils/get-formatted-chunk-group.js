/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */

export const getFormattedChunkGroup = ({
  chunks,
  manifest,
  compilation,
  withInlineCss,
}) => {
  return chunks.reduce(
    (acc, chunk) => {
      chunk.files.forEach(fileName => {
        const isJS = fileName.endsWith('.js');
        const isCSS = fileName.endsWith('.css');

        if (isJS || isCSS) {
          const filePath = manifest.getPublicPath(fileName);

          if (isJS) {
            acc.js.push(filePath);
          } else {
            acc.css.push(filePath);

            // текст берем из ассетов компиляции: это итоговый минифицированный css,
            // и не нужно читать файлы с диска
            const asset = withInlineCss && compilation.getAsset(fileName);

            if (asset) {
              acc.inlineCss.push({
                href: filePath,
                css: asset.source.source().toString(),
              });
            }
          }
        }
      });

      return acc;
    },
    { js: [], css: [], inlineCss: [] },
  );
};
