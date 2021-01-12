/* eslint-disable import/no-extraneous-dependencies */

import webpack from 'webpack';
import webpackConfig from '../configs/webpack';

const bundle = () => {
  return new Promise((resolve, reject) => {
    webpack(webpackConfig).run((err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        console.log(
          stats.toString({
            chunks: false, // Makes the build much quieter
            colors: true, // Shows colors in the console
          }),
        );

        return reject(new Error('Webpack compilation errors'));
      }

      return resolve();
    });
  });
};

export default bundle;
