/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import loaderUtils from 'loader-utils';
import { appPaths, packagePaths } from '../../utils/paths';

export const getIsProduction = () => process.env.NODE_ENV === 'production';
export const disabledProgress = process.env.DISABLE_PROGRESS === 'true';
export const hashSize = process.env.HASH_CSS_SIZE
  ? Number(process.env.HASH_CSS_SIZE)
  : 3;
const isProduction = getIsProduction();
export const isAnalyze = process.env.ANALYZE === 'true';

// eslint-disable-next-line
const pkg = require(appPaths.packageJson);

export const reScripts = /\.(js|jsx|ts|tsx)$/;
export const reImage = /\.(gif|jpg|jpeg|png|svg|webp)$/;

// style files regexes
export const reCssRegex = /\.css$/;
export const reCssModuleRegex = /\.module\.css$/;
export const reSassModuleRegex = /\.module\.scss$/;
export const reAllStyles = /(\.module)?\.(css|scss|sass)$/;

const STATIC_PATH = '/static/assets/';

export const getSWCLoader = isNode => ({
  test: /\.(ts|js)x?$/,
  exclude: /(node_modules)/,
  use: {
    loader: 'swc-loader',
    options: {
      jsc: {
        parser: {
          syntax: 'typescript',
          dynamicImport: true,
          tsx: true,
          jsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
            refresh: !isProduction && !isNode,
          },
        },
        loose: true,
        target: 'es2022',
      },
      minify: isProduction && !isNode,
    },
  },
});

export const getStyleLoadersConfig = isNode => [
  isNode
    ? {
        test: reCssRegex,
        exclude: reCssModuleRegex,
        loader: 'null-loader',
      }
    : {
        test: reCssRegex,
        exclude: reCssModuleRegex,
        rules: [
          { loader: MiniCssExtractPlugin.loader, options: {} },
          { loader: 'cache-loader' },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: {
                mode: 'icss',
              },
              sourceMap: false,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: `${packagePaths.configs}/postcss.config.js`,
              },
              sourceMap: false,
            },
          },
        ].filter(Boolean),
      },
  {
    test: reCssModuleRegex,
    rules: [
      !isNode && { loader: MiniCssExtractPlugin.loader, options: {} },
      { loader: 'cache-loader' },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: `[local]-[contenthash:${hashSize}`,
            exportOnlyLocals: isNode,
          },
          importLoaders: 1,
          sourceMap: false,
        },
      },
      !isNode && {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            config: `${packagePaths.configs}/postcss.config.js`,
          },
          sourceMap: false,
        },
      },
    ].filter(Boolean),
  },
  {
    test: reSassModuleRegex,
    rules: [
      !isNode && { loader: MiniCssExtractPlugin.loader, options: {} },
      { loader: 'cache-loader' },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: `[local]-[contenthash:${hashSize}]`,
            exportOnlyLocals: isNode,
          },
          importLoaders: 2,
          sourceMap: false,
        },
      },
      !isNode && {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            config: `${packagePaths.configs}/postcss.config.js`,
          },
          sourceMap: false,
        },
      },
      {
        loader: 'sass-loader',
        options: {
          sourceMap: false,
        },
      },
    ].filter(Boolean),
  },
];
export default {
  context: appPaths.root,

  mode: isProduction ? 'production' : 'development',

  output: {
    publicPath: STATIC_PATH,
    devtoolModuleFilenameTemplate: info =>
      path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
  },

  resolve: {
    modules: ['node_modules'],
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  devtool: isProduction ? 'source-map' : 'cheap-source-map',

  cache: {
    type: 'filesystem',
    compression: false,
    version: loaderUtils.getHashDigest(
      JSON.stringify(appPaths.packageJson),
      'md5',
      'base64',
      10,
    ),
    cacheDirectory: appPaths.appWebpackCache,
    store: 'pack',
  },

  module: {
    // Делаем несуществующие импорты ошибками а не ворнингами
    strictExportPresence: true,

    rules: [
      {
        test: [reImage, /\.txt$/, /\.(ttf|woff2|woff|eot)/],
        type: 'asset/resource',
      },
      // Для всего остального возвращаем URL
      // НЕ ЗАБЫТЬ обновить `exclude` при добавлении нового модуля
      {
        exclude: [
          reScripts,
          reAllStyles,
          reImage,
          /\.json$/,
          /\.txt$/,
          /\.md$/,
          /\.ejs$/,
          /\.woff2/,
          /\.woff/,
          /\.ttf/,
          /\.eot/,
        ],
        type: 'asset/resource',
      },
    ],
  },

  bail: isProduction,

  stats: {
    cached: false,
    cachedAssets: false,
    chunks: false,
    chunkModules: false,
    colors: true,
    hash: false,
    modules: false,
    reasons: !isProduction,
    timings: true,
    version: false,
    // Скрываем ворнинги для mini-css-extract-plugin warnings о конфликтах в порядке стилей
    warningsFilter: warning =>
      /Conflicting order. Following module has been added/gm.test(warning),
    // Скрываем логи дочерних плагинов
    children: false,
  },

  plugins: [
    new webpack.DefinePlugin({
      __DEV__: !isProduction,
      __TEST__: false,
    }),

    !isProduction &&
      new ForkTsCheckerWebpackPlugin({
        async: false,
      }),
  ].filter(Boolean),
  performance: false,
};
