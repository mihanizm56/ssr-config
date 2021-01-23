/* eslint-disable import/no-extraneous-dependencies */

import webpack from 'webpack';
import webpackConfig from '../configs/webpack';
import { getInjectedConfig } from './get-injected-config';
import { showStatsErrors } from './utils/show-stats-errors';

const bundle = () => {
  return new Promise(async (resolve, reject) => {
    const injectedConfig = await getInjectedConfig(webpackConfig);

    webpack(injectedConfig).run((err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        showStatsErrors(stats);

        return reject(new Error('Webpack compilation errors'));
      }

      return resolve();
    });
  });
};

export default bundle;
