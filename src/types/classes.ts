import HttpStatusCode from '@src/constants/HttpStatusCode';

export class RouteError extends Error {
  public status: HttpStatusCode;
  public constructor(status: HttpStatusCode, message: string) {
    super(message);
    this.status = status;
  }
}
