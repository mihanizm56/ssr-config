import os from 'os';

const singleThreaded = process.env.SINGLE_THREADED === 'true';

export const getCacheAndThreadLoaderConfig = (isProduction) =>
  isProduction
    ? [
        !singleThreaded && {
          loader: 'thread-loader',
          options: {
            workers: os.cpus().length - 1,
            poolRespawn: false,
            workerParallelJobs: 50,
            poolParallelJobs: 200,
          },
        },
      ].filter(Boolean)
    : [
        { loader: 'cache-loader' },
        !singleThreaded && {
          loader: 'thread-loader',
          options: {
            workers: os.cpus().length - 1,
            poolRespawn: false,
            workerParallelJobs: 50,
            poolParallelJobs: 200,
          },
        },
      ].filter(Boolean);
