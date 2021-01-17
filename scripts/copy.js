// eslint-disable-next-line import/no-extraneous-dependencies
import { writeFile, makeDir, copyDir } from '../utils/fs';
import { appPaths } from '../utils/paths';

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

const copy = async () => {
  await makeDir(`${appPaths.root}/build`);
  await Promise.all([
    writeFile(
      `${appPaths.root}/build/package.json`,
      JSON.stringify(
        {
          private: true,
          engines: pkg.engines,
          dependencies: pkg.dependencies,
          scripts: {
            start: 'node server.js',
          },
        },
        null,
        2,
      ),
    ),
    copyDir(appPaths.public, `${appPaths.root}/build/public`),
  ]);
};

export default copy;
