import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

/** body-parser throws http-errors objects (not HttpExceptions) before Nest's pipeline. */
const bodyParserError = (status: number, type: string) =>
  Object.assign(new Error(type), { status, statusCode: status, expose: true, type });

describe('GlobalExceptionFilter', () => {
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;
  const filter = new GlobalExceptionFilter();

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/fields' }),
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn((filter as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('a body over the limit is a 413, not a 500', () => {
    filter.catch(bodyParserError(413, 'entity.too.large'), host);
    expect(status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE' }));
  });

  it('malformed JSON is a 400', () => {
    filter.catch(bodyParserError(400, 'entity.parse.failed'), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'BAD_REQUEST', message: 'El cuerpo de la solicitud no es JSON válido' }),
    );
  });

  it('an unknown error is still a 500 without internals', () => {
    filter.catch(Object.assign(new Error('boom'), { status: 418 }), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error interno del servidor' }));
  });
});
