/* eslint-disable import/no-extraneous-dependencies */

import path from 'path';
import webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import loaderUtils from 'loader-utils';
import { appPaths, packagePaths } from '../../utils/paths';
import { resolvePath } from '../../utils/resolve-path';

export const getIsProduction = () => process.env.NODE_ENV === 'production';
export const disabledProgress = process.env.DISABLE_PROGRESS === 'true';
export const hashSize = process.env.HASH_CSS_SIZE
  ? Number(process.env.HASH_CSS_SIZE)
  : 3;
const isProduction = getIsProduction();
export const isAnalyze = process.env.ANALYZE === 'true';
// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires, security/detect-non-literal-require
const pkg = require(appPaths.packageJson);

export const reScripts = /\.(js|jsx|ts|tsx)$/;
export const reImage = /\.(gif|jpg|jpeg|png|svg|webp)$/;

// style files regexes
export const reCssRegex = /\.css$/;
export const reCssModuleRegex = /\.module\.css$/;
export const reSassModuleRegex = /\.module\.scss$/;
export const reAllStyles = /(\.module)?\.(css|scss|sass)$/;

const STATIC_PATH = '/static/assets/';

export const getBabelLoaderConfig = isNode => ({
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    cacheCompression: false,
    compact: isProduction,
    plugins: [
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      // https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-constant-elements
      isProduction && '@babel/plugin-transform-react-inline-elements',
      !isNode &&
        isProduction &&
        '@babel/plugin-transform-react-constant-elements',
    ].filter(Boolean),
    presets: [
      isNode
        ? '@babel/preset-env'
        : [
            '@babel/preset-env',
            {
              modules: false,
              corejs: 3,
              targets: {
                browsers: pkg.browserslist,
              },
              forceAllTransforms: isProduction,
              useBuiltIns: 'entry',
              // Exclude transforms that make all code slower
              exclude: ['transform-typeof-symbol'],
            },
          ],
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
        },
      ],
      '@babel/preset-typescript',
    ],
  },
});

export const getStyleLoadersConfig = isNode => [
  {
    test: reCssRegex,
    exclude: reCssModuleRegex,
    rules: [
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { reloadAll: true },
        },
      !isNode && { loader: MiniCssExtractPlugin.loader, options: {} },
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
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { cssModule: true, reloadAll: true },
        },
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
    test: reSassModuleRegex,
    rules: [
      !isNode &&
        !isProduction && {
          loader: 'css-hot-loader',
          options: { cssModule: true, reloadAll: true },
        },
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
      {
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
    alias: {
      // https://github.com/fastify/help/issues/272
      'tiny-lru': 'tiny-lru/dist/tiny-lru.cjs',
    },
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

      // Исключение dev модулей при production сборке
      isProduction && {
        test: resolvePath('node_modules/react-deep-force-update/lib/index.js'),
        loader: 'null-loader',
      },
    ].filter(Boolean),
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

    new ForkTsCheckerWebpackPlugin({
      async: false,
    }),
  ],
  performance: false,
};
