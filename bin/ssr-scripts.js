#!/usr/bin/env node

process.on('unhandledRejection', err => {
  throw err;
});

const path = require('path');
const dotenv = require('dotenv');
const spawn = require('react-dev-utils/crossSpawn');

dotenv.config();

const allowedCommands = ['build', 'start', 'build:analyse'];
const command = process.argv[2];
const prefix = path.resolve(__dirname, '../');

if (!command || !allowedCommands.includes(command)) {
  console.log(`Unknown command ${command}`);

  return;
}

const result = spawn.sync(
  `npx cross-env APP_CWD=${process.cwd()} npm run ${command} --prefix ${prefix}`,
  { stdio: 'inherit', shell: true },
);

if (result.signal) {
  if (result.signal === 'SIGKILL') {
    console.log(
      'The build failed because the process exited too early. ' +
        'This probably means the system ran out of memory or someone called ' +
        '"kill -9" on the process.',
    );
  } else if (result.signal === 'SIGTERM') {
    console.log(
      'The build failed because the process exited too early. ' +
        'Someone might have called `kill` or `killall`, or the system could ' +
        'be shutting down.',
    );
  }
  process.exit(1);
}

process.exit(result.status);
