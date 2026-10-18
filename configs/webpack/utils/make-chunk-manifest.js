import { getFormattedChunkGroup } from './get-formatted-chunk-group';

export const makeChunkManifest = ({ chunkGroups, manifest, buildPath }) =>
  chunkGroups.reduce((acc, chunkGroup) => {
    const chunkGroupName = chunkGroup.name;

    const { js, css, inlineCss } = getFormattedChunkGroup({
      chunks: chunkGroup.chunks,
      manifest,
      // текст стилей кладем только для entry-групп: они нужны на каждой странице,
      // стили роутов остаются файлами и кэшируются браузером
      buildPath: chunkGroup.isInitial() ? buildPath : null,
    });

    return {
      ...acc,
      [chunkGroupName]: {
        ...acc[chunkGroupName],
        js,
        css,
        ...(inlineCss.length > 0 ? { inlineCss } : {}),
      },
    };
  }, {});
