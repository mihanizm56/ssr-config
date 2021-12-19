/* eslint-disable no-param-reassign */
import path from 'path';
import { HotModuleReplacementPlugin } from 'webpack';
import { packagePaths } from '../../utils/paths';

export const enrichClientConfig = clientConfig => {
  clientConfig.entry.client = [
    path.join(packagePaths.utils, 'webpack-hot-dev-client'),
    clientConfig.entry.client,
  ];

  clientConfig.output.filename = clientConfig.output.filename.replace(
    'chunkhash',
    'hash',
  );
  clientConfig.output.chunkFilename = clientConfig.output.chunkFilename.replace(
    'chunkhash',
    'hash',
  );

  clientConfig.plugins.push(new HotModuleReplacementPlugin());
};
