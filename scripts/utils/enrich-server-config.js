/* eslint-disable no-param-reassign */

import { HotModuleReplacementPlugin } from 'webpack';

export const enrichServerConfig = serverConfig => {
  serverConfig.output.hotUpdateMainFilename =
    'updates/[contenthash].hot-update.json';
  serverConfig.output.hotUpdateChunkFilename =
    'updates/[id].[contenthash].hot-update.js';

  serverConfig.plugins.push(new HotModuleReplacementPlugin());
};
