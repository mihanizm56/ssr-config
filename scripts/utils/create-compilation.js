export const createCompilation = (name, compiler) =>
  new Promise((resolve, reject) => {
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
