import { getFormattedChunkGroup } from './get-formatted-chunk-group';

export const makeChunkManifest = ({ chunkGroups, manifest, buildPath }) =>
  chunkGroups.reduce((acc, chunkGroup) => {
    const chunkGroupName = chunkGroup.name;

    const { js, css, inlineCss } = getFormattedChunkGroup({
      chunks: chunkGroup.chunks,
      manifest,
      buildPath,
    });

    return {
      ...acc,
      [chunkGroupName]: {
        ...acc[chunkGroupName],
        js,
        css,
        inlineCss,
      },
    };
  }, {});
