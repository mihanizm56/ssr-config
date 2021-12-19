/* eslint-disable no-param-reassign */

import { HotModuleReplacementPlugin } from 'webpack';

export const enrichServerConfig = serverConfig => {
  serverConfig.output.hotUpdateMainFilename = 'updates/[hash].hot-update.json';
  serverConfig.output.hotUpdateChunkFilename =
    'updates/[id].[hash].hot-update.js';

  serverConfig.plugins.push(new HotModuleReplacementPlugin());
};
