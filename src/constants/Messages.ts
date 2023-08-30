/* eslint-disable @typescript-eslint/no-explicit-any */

export const Messages = {
  Running: (port: string | number) => `Running on port ${port}`,
  SomethingWentWrong: (err: any) => `Something went wrong: ${err}`,
  QueueNotFound: (queueName: string) => `Queue ${queueName} not found`,
  ProcessedJob: (jobId: string | undefined, queueName: string) =>
    `Processed job with id ${jobId} from the ${queueName} queue`,
  ScheduledRecurringJob: (jobName: string) => `Scheduled recurring job ${jobName}`,
  ErrorSchedulingRecurringJob: (jobName: string, error: any) => `Error scheduling recurring job ${jobName}: ${error}`,
  FailedJobNoJobInstance: (message: string) => `Failed job with no job instance. \nError: ${message}`,
  ManuallyTriggeredJob: (jobName: string) => `Manually triggered job ${jobName}`,
  FailedToTriggerJob: (jobName: string, error: any) => `Failed to trigger job ${jobName}: ${error}`,
  JobNotImplemented: (jobName: string) => `Job ${jobName} not implemented`,
};
