import dotenv from 'dotenv';
import { join } from 'path';
import { parse } from 'ts-command-line-args';

interface IArgs {
  env: string;
}

const args = parse<IArgs>({
  env: {
    type: String,
    defaultValue: 'development',
    alias: 'e',
  },
});

const configureEnv = dotenv.config({
  path: join(__dirname, `../env/${args.env}.env`),
});

if (configureEnv.error) {
  throw configureEnv.error;
}
