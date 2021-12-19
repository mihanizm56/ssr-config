import 'colors';

const run = (fn, options) => {
  const task = typeof fn.default === 'undefined' ? fn : fn.default;

  return task(options);
};

if (require.main === module && process.argv.length > 2) {
  // eslint-disable-next-line no-underscore-dangle
  delete require.cache[__filename];

  // eslint-disable-next-line global-require, import/no-dynamic-require, security/detect-non-literal-require
  const module = require(`./${process.argv[2]}.js`).default;

  run(module).catch(error => {
    console.log(`${error.stack}`.red);
    process.exit(1);
  });
}

export default run;
