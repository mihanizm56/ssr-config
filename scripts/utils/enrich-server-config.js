/* eslint-disable no-param-reassign */

import { HotModuleReplacementPlugin } from 'webpack';

export const enrichServerConfig = serverConfig => {
  serverConfig.output.hotUpdateMainFilename =
    'updates/[fullhash].hot-update.json';
  serverConfig.output.hotUpdateChunkFilename =
    'updates/[id].[fullhash].hot-update.js';

  serverConfig.plugins.push(new HotModuleReplacementPlugin());
};
