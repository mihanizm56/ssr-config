const mapFileFilter = (file) => !file.endsWith('.map');
const cssFileFilter = (file) => file.endsWith('.css');
const jsFileFilter = (file) => file.endsWith('.js');
const addPath = (manifest) => (file) => manifest.getPublicPath(file);

export const makeChunkManifest = ({ chunkGroups, manifest }) =>
  chunkGroups.reduce((acc, chunkGroup) => {
    return {
      ...acc,
      [chunkGroup.name]: {
        ...acc[chunkGroup.name],

        js: chunkGroup.chunks.reduce((files, cc) => {
          const newFiles = cc.files
            .filter(mapFileFilter)
            .filter(jsFileFilter)
            .map(addPath(manifest));

          return [...files, ...newFiles];
        }, []),

        css: chunkGroup.chunks.reduce((files, cc) => {
          const newFiles = cc.files
            .filter(mapFileFilter)
            .filter(cssFileFilter)
            .map(addPath);

          return [...files, ...newFiles];
        }, []),
      },
    };
  }, {});
