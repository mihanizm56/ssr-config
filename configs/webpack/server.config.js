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
} from './common.config';
import { getCacheAndThreadLoaderConfig } from './utils/get-thread-and-cache-loader';

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
  },

  module: {
    ...common.module,
    rules: [
      {
        test: reScripts,
        use: [
          ...getCacheAndThreadLoaderConfig(isProduction),
          getBabelLoaderConfig(true),
        ],
      },
      ...getStyleLoadersConfig(true),

      ...overrideWebpackRules(common.module.rules, (rule) => {
        // Переписываем пути для статических ассетов
        if (
          rule.loader === 'file-loader' ||
          rule.loader === 'url-loader' ||
          rule.loader === 'svg-url-loader'
        ) {
          return {
            ...rule,
            options: {
              ...rule.options,
              emitFile: false,
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
      whitelist: [reAllStyles, reImage],
    }),
  ],

  plugins: [
    ...common.plugins,

    new webpack.DefinePlugin({
      'process.env.BROWSER': false,
      __SERVER__: true,
      __CLIENT__: false,
    }),

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

  node: {
    console: false,
    global: false,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
  },
};
