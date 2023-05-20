/* eslint-disable global-require, import/no-extraneous-dependencies, @typescript-eslint/no-var-requires */

const { appPaths } = require('../utils/paths');

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

module.exports = () => {
  return {
    // The list of plugins for PostCSS
    // https://github.com/postcss/postcss
    plugins: [
      // W3C calc() function, e.g. div { height: calc(100px - 2em); }
      // https://github.com/postcss/postcss-calc
      require('postcss-calc')(),
      // Postcss flexbox bug fixer
      // https://github.com/luisrudge/postcss-flexbugs-fixes
      require('postcss-flexbugs-fixes')(),
      // Add vendor prefixes to CSS rules using values from caniuse.com
      // https://github.com/postcss/autoprefixer
      require('autoprefixer')({
        flexbox: 'no-2009',
        overrideBrowserslist: pkg.browserslist,
      }),
    ],
  };
};
