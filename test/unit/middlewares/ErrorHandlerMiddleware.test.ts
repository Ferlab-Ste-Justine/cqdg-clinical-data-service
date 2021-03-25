import MockExpressResponse from 'mock-express-response';
import { HttpError } from 'routing-controllers';

import { ErrorHandlerMiddleware } from '../../../src/api/middlewares/ErrorHandlerMiddleware';
import { LogMock } from '../lib/LogMock';

describe('ErrorHandlerMiddleware', () => {
    let log;
    let middleware;
    let err;
    let res;
    beforeEach(() => {
        log = new LogMock();
        middleware = new ErrorHandlerMiddleware(log);
        res = new MockExpressResponse();
        err = new HttpError(400, 'Test Error');
    });

    test('Should print stack out in development', () => {
        middleware.isProduction = false;
        middleware.error(err, undefined, res, undefined);
        const json = res._getJSON();
        expect(json.name).toBe(err.name);
        expect(json.message).toBe(err.message);
        expect(log.errorMock).toHaveBeenCalled();
    });
});
