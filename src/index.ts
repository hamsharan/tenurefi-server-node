import './pre-start'; // Must be the first import
import logger from 'jet-logger';

import EnvVars from '@src/constants/EnvVars';

const SERVER_START_MSG = 'Tenure Server started on port: ' + EnvVars.Port.toString();
