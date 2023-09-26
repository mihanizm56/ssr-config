/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */

import { readFileSync } from 'fs';
import path from 'path';

export const getFormattedChunkGroup = ({ chunks, manifest, buildPath }) => {
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
            const cssContent = buildPath
              ? readFileSync(path.join(buildPath, filePath), 'utf-8')
              : '';

            acc.css.push(filePath);
            acc.inlineCss = acc.inlineCss.concat(cssContent);
          }
        }
      });

      return acc;
    },
    { js: [], css: [], inlineCss: '' },
  );
};
