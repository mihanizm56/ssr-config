#!/usr/bin/env node

'use strict';

process.on('unhandledRejection', err => {
  throw err;
});

const path = require('path'); 
const spawn = require('react-dev-utils/crossSpawn');
const { packagePaths } = require('ssr-scripts/utils/paths');
const { getConsoleArgs } = require('../utils/get-args');

const allowedCommands = ['build','start'];
const command = process.argv[2];

if(!command || !allowedCommands.includes(command)){
  console.log(`Unknown command ${command}`);
  return
}

const result = spawn.sync(
  `npm run ${command} --prefix ${packagePaths.root}`,
  { stdio: 'inherit', shell: true }
);

if (result.signal) {
  if (result.signal === 'SIGKILL') {
    console.log(
      'The build failed because the process exited too early. ' +
      'This probably means the system ran out of memory or someone called ' +
      '"kill -9" on the process.'
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
