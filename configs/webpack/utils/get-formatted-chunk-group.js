/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */

export const getFormattedChunkGroup = ({ chunks, manifest }) =>
  chunks.reduce(
    (acc, chunk) => {
      // бежим по модулям и если этот модуль обработан mini-extract
      // то собираем содержимое в строку для инлайн-отдачи в html
      // for (const item of chunk._modules) {
      //   if (item.type === 'css/mini-extract') {
      //     acc.inlineCss = acc.inlineCss.concat(item.content);
      //   }
      // }

      chunk.files.forEach(file => {
        const isJS = file.endsWith('.js');
        const isCSS = file.endsWith('.css');

        if (isJS || isCSS) {
          const filePath = manifest.getPublicPath(file);

          if (isJS) {
            acc.js.push(filePath);
          } else {
            acc.css.push(filePath);
          }
        }
      });

      return acc;
    },
    { js: [], css: [], inlineCss: '' },
  );
