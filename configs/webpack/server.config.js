/* eslint-disable import/no-extraneous-dependencies */

import os from 'os';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { appPaths, packagePaths } from '../../utils/paths';
import { overrideWebpackRules } from '../../utils/override-webpack-rules';
import common, {
  getIsProduction,
  reCssRegex,
  reCssModuleRegex,
  reSassAllRegex,
  reImage,
  reAllStyles,
  reScripts,
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
  },

  module: {
    ...common.module,
    rules: [
      {
        test: reScripts,
        use: [
          { loader: 'cache-loader' },
          {
            loader: 'thread-loader',
            options: {
              workers: os.cpus().length - 1,
              poolRespawn: false,
            },
          },
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false,
              compact: isProduction,
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-syntax-dynamic-import',
                '@babel/plugin-transform-exponentiation-operator',
                // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-constant-elements
                isProduction && '@babel/plugin-transform-react-inline-elements',
              ].filter(Boolean),
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
            },
          },
        ],
      },

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
      {
        test: reCssRegex,
        exclude: reCssModuleRegex,
        rules: [
          {
            loader: 'css-loader',
            options: {
              onlyLocals: true,
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              config: {
                path: `${packagePaths.configs}/postcss.config.js`,
              },
            },
          },
        ].filter(Boolean),
      },
      {
        test: reCssModuleRegex,
        rules: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]-[hash:base64:10]',
              },
              onlyLocals: true,
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              config: {
                path: `${packagePaths.configs}/postcss.config.js`,
              },
            },
          },
        ].filter(Boolean),
      },
      {
        test: reSassAllRegex,
        rules: [
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[local]-[hash:base64:10]',
              },
              onlyLocals: true,
              importLoaders: 2,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: !isProduction,
              config: {
                path: `${packagePaths.configs}/postcss.config.js`,
              },
            },
          },
          {
            loader: 'sass-loader',
            options: { sourceMap: !isProduction },
          },
        ].filter(Boolean),
      },
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

    // Добавляем "баннер" для каждого собранного чанка
    // https://webpack.js.org/plugins/banner-plugin/
    isProduction &&
      new webpack.BannerPlugin({
        banner: 'require("source-map-support").install();',
        raw: true,
        entryOnly: false,
      }),

    !isProduction &&
      new ForkTsCheckerWebpackPlugin({
        async: true,
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
