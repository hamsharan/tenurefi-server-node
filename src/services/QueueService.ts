import { Job, Queue, QueueOptions, Worker } from 'bullmq';
import logger from 'jet-logger';

import { Environments } from '@src/constants/Environments';
import EnvVars from '@src/constants/EnvVars';
import { Messages } from '@src/constants/Messages';
import { Queues } from '@src/constants/Queues';

class QueueService {
  private static instance: QueueService | null = null;

  private queues: Record<string, Queue>;
  private defaultQueue!: Queue;
  private defaultQueueWorker!: Worker;

  private static QUEUE_OPTIONS: QueueOptions = {
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
    connection: {
      host: EnvVars.RedisHost,
      port: EnvVars.RedisPort,
      password: EnvVars.NodeEnv === Environments.Development ? undefined : EnvVars.RedisPassword,
    },
  };

  private constructor() {
    this.queues = {};
    this.instantiateQueues();
    this.instantiateWorkers();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public getQueue(name: Queues): Queue {
    return this.queues[name];
  }

  private instantiateQueues() {
    this.defaultQueue = new Queue(Queues.DEFAULT, QueueService.QUEUE_OPTIONS);
    this.queues[Queues.DEFAULT] = this.defaultQueue;
  }

  private instantiateWorkers() {
    this.defaultQueueWorker = new Worker(
      Queues.DEFAULT,
      async (job: Job) => {
        try {
          switch (job.name) {
            default:
              logger.warn(Messages.JobNotImplemented(job.name));
          }
        } catch (error) {
          logger.err(error);
        }
      },
      { connection: QueueService.QUEUE_OPTIONS.connection },
    );

    this.defaultQueueWorker.on('completed', (job: Job, value) => {
      logger.info(`Completed job with data\n
        Data: ${job.asJSON().data}\n
        ID: ${job.id}\n
        Value: ${value}`);
    });

    this.defaultQueueWorker.on('failed', (job: Job | undefined, value) => {
      if (job) {
        logger.err(`Failed job with data\n
            Data: ${job.asJSON().data}\n
            ID: ${job.id}\n
            Value: ${value.message}`);
      } else {
        logger.err(Messages.FailedJobNoJobInstance(value.message));
      }
    });
  }
}

export default QueueService;
