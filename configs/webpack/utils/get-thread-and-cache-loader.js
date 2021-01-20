import os from 'os';

export const getCacheAndThreadLoaderConfig = (isProduction) =>
  isProduction
    ? [
        {
          loader: 'thread-loader',
          options: {
            workers: os.cpus().length - 1,
            poolRespawn: false,
            workerParallelJobs: 50,
            poolParallelJobs: 200,
          },
        },
      ]
    : [
        { loader: 'cache-loader' },
        {
          loader: 'thread-loader',
          options: {
            workers: os.cpus().length - 1,
            poolRespawn: false,
            workerParallelJobs: 50,
            poolParallelJobs: 200,
          },
        },
      ];
