import { getFormattedChunkGroup } from './get-formatted-chunk-group';

export const makeChunkManifest = ({ chunkGroups, manifest }) =>
  chunkGroups.reduce((acc, chunkGroup) => {
    const chunkGroupName = chunkGroup.name;

    const { js, css } = getFormattedChunkGroup({
      chunks: chunkGroup.chunks,
      manifest,
    });

    return {
      ...acc,
      [chunkGroupName]: {
        ...acc[chunkGroupName],
        js,
        css,
      },
    };
  }, {});
