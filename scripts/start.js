/* eslint-disable import/no-extraneous-dependencies */

import 'colors';
import express from 'express';
import browserSync from 'browser-sync';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import errorOverlayMiddleware from 'react-dev-utils/errorOverlayMiddleware';
import webpackConfig from '../configs/webpack';
import { appPaths, packagePaths } from '../utils/paths';
import run from './run';
import clean from './clean';
import { getInjectedConfig } from './get-injected-config';

// https://webpack.js.org/configuration/watch/#watchoptions
const watchOptions = {
  // poll: true,
  // ignored: /node_modules/,
  aggregateTimeout: 1000,
};

const openBrowser = process.env.BROWSER !== 'none';
const PORT = process.env.PORT || 3000;

const createCompilationPromise = (name, compiler) => {
  return new Promise((resolve, reject) => {
    compiler.hooks.done.tap(name, (stats) => {
      if (stats.hasErrors()) {
        console.log(
          stats.toString({
            chunks: false, // Makes the build much quieter
            colors: true, // Shows colors in the console
          }),
        );
        reject(new Error('Compilation failed!'));
      } else {
        resolve(stats);
      }
    });
  });
};

let server;

const start = async () => {
  if (server) return server;
  server = express();
  server.use(errorOverlayMiddleware());
  server.use('/static', express.static(appPaths.public));

  const webpackResultConfig = await getInjectedConfig(webpackConfig);

  // Configure client-side hot module replacement
  const clientConfig = webpackResultConfig.find(
    (config) => config.name === 'client',
  );
  clientConfig.entry.client = [`${packagePaths.utils}/webpack-hot-dev-client`]
    .concat(clientConfig.entry.client)
    .sort((a, b) => b.includes('polyfill') - a.includes('polyfill'));

  clientConfig.output.filename = clientConfig.output.filename.replace(
    'chunkhash',
    'hash',
  );
  clientConfig.output.chunkFilename = clientConfig.output.chunkFilename.replace(
    'chunkhash',
    'hash',
  );
  clientConfig.module.rules = clientConfig.module.rules.filter(
    (x) => x.loader !== 'null-loader',
  );
  clientConfig.plugins.push(new webpack.HotModuleReplacementPlugin());

  const serverConfig = webpackResultConfig.find(
    (config) => config.name === 'server',
  );
  serverConfig.output.hotUpdateMainFilename = 'updates/[hash].hot-update.json';
  serverConfig.output.hotUpdateChunkFilename =
    'updates/[id].[hash].hot-update.js';
  serverConfig.module.rules = serverConfig.module.rules.filter(
    (x) => x.loader !== 'null-loader',
  );
  serverConfig.plugins.push(new webpack.HotModuleReplacementPlugin());

  await run(clean);
  const multiCompiler = webpack([clientConfig, serverConfig]);
  const clientCompiler = multiCompiler.compilers.find(
    (compiler) => compiler.name === 'client',
  );
  const serverCompiler = multiCompiler.compilers.find(
    (compiler) => compiler.name === 'server',
  );
  const clientPromise = createCompilationPromise(
    'client',
    clientCompiler,
    clientConfig,
  );
  const serverPromise = createCompilationPromise(
    'server',
    serverCompiler,
    serverConfig,
  );

  server.use(
    webpackDevMiddleware(clientCompiler, {
      publicPath: clientConfig.output.publicPath,
      logLevel: 'silent',
      watchOptions,
    }),
  );

  server.use(webpackHotMiddleware(clientCompiler, { log: false }));

  let appPromise;
  let appPromiseResolve;
  let appPromiseIsResolved = true;
  serverCompiler.hooks.compile.tap('server', () => {
    if (!appPromiseIsResolved) return;
    appPromiseIsResolved = false;
    // eslint-disable-next-line no-return-assign
    appPromise = new Promise((resolve) => (appPromiseResolve = resolve));
  });

  let app;
  server.use((req, res) => {
    appPromise
      .then(() => app.handle(req, res))
      .catch((error) => console.error(error));
  });

  function checkForUpdate(fromUpdate) {
    const hmrPrefix = '[\x1b[35mHMR\x1b[0m] ';

    if (!app.hot) {
      throw new Error(`${hmrPrefix}Hot Module Replacement is disabled.`);
    }

    if (app.hot.status() !== 'idle') {
      return Promise.resolve();
    }

    return app.hot
      .check(true)
      .then((updatedModules) => {
        if (!updatedModules) {
          if (fromUpdate) {
            console.log(`${hmrPrefix}Update applied.`.green);
          }

          return;
        }
        if (updatedModules.length === 0) {
          console.log(`${hmrPrefix}Nothing hot updated.`.yellow);

          return;
        }

        console.log(`${hmrPrefix}Updated modules:`.green);
        updatedModules.forEach((moduleId) => {
          console.log(`${hmrPrefix} - ${moduleId}`.green);
        });

        checkForUpdate(true);
      })
      .catch((error) => {
        if (['abort', 'fail'].includes(app.hot.status())) {
          console.warn(`${hmrPrefix}Cannot apply update.`.yellow.underline);

          // Удаление server.js из require.cache
          delete require.cache[require.resolve(`${appPaths.build}/server`)];

          // Удаление чанков из require.cache
          Object.keys(require.cache).forEach((filename) => {
            if (
              /.*\/build\/chunks\/[^/]+/.test(filename) ||
              /.*\\build\\chunks\\[^\\]+/.test(filename)
            ) {
              delete require.cache[filename];
            }
          });

          // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
          app = require(`${appPaths.build}/server`).default;
          console.warn(`${hmrPrefix}App has been reloaded.`.green);
        } else {
          console.log(`${hmrPrefix}Update failed`.red);
          console.log(`${error.stack || error.message}`.red);
        }
      });
  }

  serverCompiler.watch(watchOptions, (error, stats) => {
    const isSuccess = app && !error && !stats.hasErrors();

    if (!isSuccess) {
      return;
    }

    checkForUpdate().then(() => {
      appPromiseIsResolved = true;
      appPromiseResolve();
    });
  });

  // Ждем пока оба промиса сборки зарезолвятся
  await clientPromise;
  await serverPromise;

  // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
  app = require(`${appPaths.build}/server`).default;
  appPromiseIsResolved = true;
  appPromiseResolve();

  // Запуск dev сервера с browsersync и HMR
  await new Promise((resolve, reject) =>
    browserSync.create().init(
      {
        // https://www.browsersync.io/docs/options
        server: true,
        middleware: [server],
        open: openBrowser,
        notify: false,
        ui: false,
        port: PORT,
      },
      (error, bs) => (error ? reject(error) : resolve(bs)),
    ),
  ); // eslint-disable-line function-paren-newline

  return server;
};

export default start;
