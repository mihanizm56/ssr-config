/* eslint-disable import/no-extraneous-dependencies */

import webpack from 'webpack';
import merge from 'webpack-merge';
import webpackConfig from '../configs/webpack';
import { getInjectedConfig } from './get-injected-config';

const bundle = () => {
  return new Promise(async (resolve, reject) => {
    const injectedConfig = await getInjectedConfig();

    const resultClientConfig = merge.smart(
      webpackConfig[0],
      injectedConfig.client,
    );
    const resultServerConfig = merge.smart(
      webpackConfig[1],
      injectedConfig.server,
    );

    webpack([resultClientConfig, resultServerConfig]).run((err, stats) => {
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
