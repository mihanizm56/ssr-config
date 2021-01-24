/* eslint-disable import/no-extraneous-dependencies */

import 'colors';

import express from 'express';
import browserSync from 'browser-sync';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import errorOverlayMiddleware from 'react-dev-utils/errorOverlayMiddleware';
import webpackConfig from '../configs/webpack';
import { appPaths } from '../utils/paths';
import run from './run';
import clean from './clean';
import { getInjectedConfig } from './get-injected-config';
import { createCompilation } from './utils/create-compilation';
import { enrichClientConfig } from './utils/enrich-client-config';
import { enrichServerConfig } from './utils/enrich-server-config';
import { showStatsErrors } from './utils/show-stats-errors';

// https://webpack.js.org/configuration/watch/#watchoptions
const watchOptions = {
  // poll: true,
  // ignored: /node_modules/,
  aggregateTimeout: 1000,
};

const openBrowser = process.env.BROWSER !== 'none';
const PORT = process.env.PORT || 3000;

const start = async () => {
  const server = express();
  server.use(errorOverlayMiddleware());
  server.use('/static', express.static(appPaths.public));

  const webpackResultConfig = await getInjectedConfig(webpackConfig);

  await run(clean);

  // Configure client-side hot module replacement
  const clientConfig = webpackResultConfig.find(
    (config) => config.name === 'client',
  );
  const serverConfig = webpackResultConfig.find(
    (config) => config.name === 'server',
  );

  enrichClientConfig(clientConfig);
  enrichServerConfig(serverConfig);

  const webpackResultCompiler = webpack([clientConfig, serverConfig]);

  const clientCompiler = webpackResultCompiler.compilers.find(
    (compiler) => compiler.name === 'client',
  );
  const serverCompiler = webpackResultCompiler.compilers.find(
    (compiler) => compiler.name === 'server',
  );

  const clientCompilation = createCompilation('client', clientCompiler);
  const serverCompilation = createCompilation('server', serverCompiler);

  server.use(
    webpackDevMiddleware(clientCompiler, {
      publicPath: clientConfig.output.publicPath,
      logLevel: 'error',
      watchOptions,
    }),
  );

  server.use(webpackHotMiddleware(clientCompiler, { log: false }));

  let appPromise;
  let appPromiseResolve;
  let app;
  let appPromiseIsResolved = true;

  serverCompiler.hooks.compile.tap('server', () => {
    if (!appPromiseIsResolved) {
      return;
    }

    appPromiseIsResolved = false;
    // eslint-disable-next-line no-return-assign
    appPromise = new Promise((resolve) => {
      appPromiseResolve = resolve;
    });
  });

  // передаём траффик с девсервера вебпака на наш
  server.use(async (req, res) => {
    try {
      await appPromise;

      app.handle(req, res);
    } catch (error) {
      console.log(`${error}`.red);
    }
  });

  function checkForUpdate(fromUpdate) {
    const hmrPrefix = '[\x1b[35mHMR\x1b[0m]';

    if (!app.hot) {
      console.log(`${hmrPrefix} ${'Hot Module Replacement is disabled'.red}`);

      return;
    }

    if (app.hot.status() !== 'idle') {
      return Promise.resolve();
    }

    return app.hot
      .check(true)
      .then((updatedModules) => {
        if (!updatedModules) {
          if (fromUpdate) {
            console.log(`${hmrPrefix} ${'Update applied'.green}`);
          }

          return;
        }
        if (updatedModules.length === 0) {
          console.log(`${hmrPrefix} ${'Nothing hot updated'.yellow}`);

          return;
        }

        console.log(`${hmrPrefix} ${'Updated modules:'.green}`);
        updatedModules.forEach((moduleId) => {
          console.log(`${hmrPrefix} - ${`${moduleId}`.green}`);
        });

        checkForUpdate(true);
      })
      .catch((error) => {
        if (['abort', 'fail'].includes(app.hot.status())) {
          console.log(`${hmrPrefix} ${'Cannot apply update'.yellow.underline}`);
          console.log(`reason: ${app.hot.status()}`.red);

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

          // переустанавливаем сервер нашего приложения в переменную
          // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
          app = require(`${appPaths.build}/server`).default;
          console.log(`${hmrPrefix} ${'App has been reloaded'.green}`);
        } else {
          console.log(`${hmrPrefix} ${'Update failed'.red}`);
          console.log(`${error.stack || error.message}`.red);
        }
      });
  }

  // подписываемся на обновление файлов вебпака
  serverCompiler.watch(watchOptions, async (error, stats) => {
    const isError = !app || error || stats.hasErrors();

    // начальный старт еще не имеет собранного сервера app
    if (!app) {
      return;
    }

    // вывод ошибок
    if (isError) {
      if (error) {
        console.log(`${error}`.red);
      } else {
        showStatsErrors(stats);
      }

      return;
    }

    // вызываем функцию обновления hmr
    await checkForUpdate();

    // завершаем сборку
    appPromiseIsResolved = true;
    appPromiseResolve();
  });

  // Ждем пока оба промиса сборки зарезолвятся
  await clientCompilation;
  await serverCompilation;

  // записываем серверную часть в переменную app
  // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require, security/detect-non-literal-require
  app = require(`${appPaths.build}/server`).default;

  // завершаем сборку
  appPromiseIsResolved = true;
  appPromiseResolve();

  // Запуск dev сервера с browsersync и HMR
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
    (error) => {
      if (error) {
        throw new Error('Browsersync error', error);
      }
    },
  );
};

export default start;
