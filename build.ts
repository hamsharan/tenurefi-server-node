import { exec as cpExec } from 'child_process';
import { remove as fsRemove } from 'fs-extra';
import logger from 'jet-logger';

const remove = (location: string): Promise<void> => {
  return new Promise((res, rej) => {
    return fsRemove(location, (err) => {
      return !!err ? rej(err) : res();
    });
  });
};

const exec = (command: string, location: string): Promise<void> => {
  return new Promise((res, rej) => {
    return cpExec(command, { cwd: location }, (err, stdout, stderr) => {
      if (!!stdout) {
        logger.info(stdout);
      }
      if (!!stderr) {
        logger.warn(stderr);
      }

      return !!err ? rej(err) : res();
    });
  });
};

async () => {
  try {
    await remove('./dist');
    await exec('tsc --build tsconfig.prod.json', './');
  } catch (err) {
    logger.err(err);
  }
};
