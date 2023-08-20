/* eslint-disable no-param-reassign */
import path from 'path';
import { HotModuleReplacementPlugin } from 'webpack';
import { packagePaths } from '../../utils/paths';

export const enrichClientConfig = clientConfig => {
  clientConfig.entry.client = [
    path.join(packagePaths.utils, 'webpack-hot-middleware/client'),
    clientConfig.entry.client,
  ];

  clientConfig.plugins.push(new HotModuleReplacementPlugin());
};
