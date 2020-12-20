#!/usr/bin/env node

'use strict';

process.on('unhandledRejection', err => {
  throw err;
});

const path = require('path'); 
const spawn = require('react-dev-utils/crossSpawn');
const { getConsoleArgs } = require('../utils/get-args');

const { command } = getConsoleArgs(process.argv);

const allowedCommands = ['build','start'];

if (allowedCommands.includes(command)) {
  const result = spawn.sync(
    `npm run ${command}`,
    { stdio: 'inherit', shell: true }
  );

  if (result.signal) {
    if (result.signal === 'SIGKILL') {
      console.log(
        'The build failed because the process exited too early. ' +
          'This probably means the system ran out of memory or someone called ' +
          '`kill -9` on the process.'
      );
    } else if (result.signal === 'SIGTERM') {
      console.log(
        'The build failed because the process exited too early. ' +
          'Someone might have called `kill` or `killall`, or the system could ' +
          'be shutting down.'
      );
    }
    process.exit(1);
  }
  process.exit(result.status);
} else {
  console.log('Unknown script "' + script + '".');
}
