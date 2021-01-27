import { HttpError } from 'routing-controllers';

export class NotFoundError extends HttpError {
    constructor(msg: string) {
        super(404, msg);
    }
}
