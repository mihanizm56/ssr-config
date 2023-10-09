/* eslint-disable import/no-extraneous-dependencies */

import 'colors';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import TerserPlugin from 'terser-webpack-plugin';
import WebpackBar from 'webpackbar';
import { appPaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  getIsProduction,
  reImage,
  reAllStyles,
  getStyleLoadersConfig,
  disabledProgress,
  getSWCLoader,
} from './common.config';

const isProduction = getIsProduction();

export default {
  ...common,
  name: 'server',
  target: 'node',

  entry: {
    server: './src/server/index.ts',
  },

  output: {
    ...common.output,
    path: appPaths.build,
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    libraryTarget: 'commonjs2',
  },

  // Webpack мутирует resolve объект, клонируем чтобы избежать этого
  // https://github.com/webpack/webpack/issues/4817
  resolve: {
    ...common.resolve,
    fallback: {
      console: false,
      global: false,
      process: false,
      Buffer: false,
      __filename: false,
      __dirname: false,
    },
  },

  module: {
    ...common.module,
    rules: [
      getSWCLoader(true),
      ...getStyleLoadersConfig(true),
      ...overrideWebpackRules(common.module.rules, rule => {
        // Выключаем создание генерацию файлов на стороне серверной сборки
        if (rule.type && rule.type.indexOf('asset/') !== -1) {
          return {
            ...rule,
            generator: {
              emit: false,
            },
          };
        }

        return rule;
      }),
    ],
  },

  externals: [
    'node-fetch',
    './chunk-manifest.json',
    './asset-manifest.json',
    nodeExternals({
      allowlist: [reAllStyles, reImage],
    }),
    'bufferutil',
    'utf-8-validate',
  ],

  plugins: [
    ...common.plugins,

    new webpack.DefinePlugin({
      'process.env.BROWSER': false,
      __SERVER__: true,
      __CLIENT__: false,
    }),

    !disabledProgress &&
      new WebpackBar({
        name: 'server',
        color: 'yellow',
      }),
  ].filter(Boolean),

  optimization: {
    minimize: isProduction,
    minimizer: [new TerserPlugin({ minify: TerserPlugin.swcMinify })],
  },
};
