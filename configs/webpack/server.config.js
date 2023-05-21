/* eslint-disable import/no-extraneous-dependencies */

import 'colors';

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import WebpackBar from 'webpackbar';
import { appPaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  getIsProduction,
  reImage,
  reAllStyles,
  reScripts,
  getBabelLoaderConfig,
  getStyleLoadersConfig,
  disabledProgress,
} from './common.config';
import { getThreadLoaderConfig } from './utils/get-thread-and-cache-loader';

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
      {
        test: reScripts,
        include: /fastify|undici/,
        use: [...getThreadLoaderConfig(), getBabelLoaderConfig(true)],
      },
      {
        test: reScripts,
        exclude: /node_modules/,
        use: [...getThreadLoaderConfig(), getBabelLoaderConfig(true)],
      },
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

    // Добавляем "баннер" для каждого собранного чанка
    // https://webpack.js.org/plugins/banner-plugin/
    isProduction &&
      new webpack.BannerPlugin({
        banner: 'require("source-map-support").install();',
        raw: true,
        entryOnly: false,
      }),
  ].filter(Boolean),
};
