/* eslint-disable global-require, import/no-extraneous-dependencies, @typescript-eslint/no-var-requires */

const { appPaths } = require('../utils/paths');

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

module.exports = () => {
  return {
    // The list of plugins for PostCSS
    // https://github.com/postcss/postcss
    plugins: [
      // Add vendor prefixes to CSS rules using values from caniuse.com
      // https://github.com/postcss/autoprefixer
      require('autoprefixer')({
        flexbox: false,
        overrideBrowserslist: pkg.browserslist,
      }),
    ],
  };
};
