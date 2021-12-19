import { showStatsErrors } from './show-stats-errors';

export const createCompilation = (name, compiler) =>
  new Promise((resolve, reject) => {
    compiler.hooks.done.tap(name, stats => {
      if (stats.hasErrors()) {
        showStatsErrors(stats);

        reject(new Error('Compilation failed!'));
      } else {
        resolve(stats);
      }
    });
  });
