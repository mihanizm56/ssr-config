/* eslint-disable no-param-reassign */
import path from 'path';
import { HotModuleReplacementPlugin } from 'webpack';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { packagePaths } from '../../utils/paths';

export const enrichClientConfig = clientConfig => {
  clientConfig.entry.client = [
    path.join(packagePaths.utils, 'webpack-hot-dev-client'),
    clientConfig.entry.client,
  ];

  clientConfig.output.filename = clientConfig.output.filename.replace(
    'chunkhash',
    'contenthash',
  );
  clientConfig.output.chunkFilename = clientConfig.output.chunkFilename.replace(
    'chunkhash',
    'contenthash',
  );

  clientConfig.plugins.push(new HotModuleReplacementPlugin());
  clientConfig.plugins.push(
    new ReactRefreshWebpackPlugin({
      sockIntegration: 'whm',
    }),
  );
};
