import { FileServer, HttpContextState, HttpServer, HttpServerOptions, HTTPStatusCode, IHttpContext, IHttpServer, IHttpServerOptions, IRequestHandler } from '@aurelia/http-server';
import { ConsoleSink, DI, ILogger, IPlatform, LoggerConfiguration, LogLevel, Registration } from '@aurelia/kernel';
import { Platform } from '@aurelia/platform';
import { getNewStorageFor, IStorage, Storages, NotFoundError } from '@benchmarking-apps/storage';
import { join } from 'path';
import { parse } from 'querystring';

const required = Symbol('required') as unknown as string;
const optional = void 0 as unknown as string;
export const IProcessEnv = DI.createInterface<IProcessEnv>('IProcessEnv', x => x.instance(new ProcessEnv(process.env)));
export interface IProcessEnv extends ProcessEnv { }
export class ProcessEnv {
  public static readonly names = [
    'AZURE_COSMOS_DB_KEY',
    'AZURE_COSMOS_DB_ENDPOINT',
    'HTTP_SERVER_ROOT',
    'HTTP_SERVER_HOSTNAME',
    'HTTP_SERVER_PORT',
    'HTTP_SERVER_USEHTTP2',
    'HTTP_SERVER_USEHTTPS',
    'HTTP_SERVER_KEY',
    'HTTP_SERVER_CERT',
    'HTTP_SERVER_LOGLEVEL',
    'HTTP_SERVER_RESPONSE_CACHE_CONTROL',
  ] as const;

  private static readonly schemas: Record<string, Record<string, typeof required | typeof optional>> = {
    prod: {
      AZURE_COSMOS_DB_KEY: required,
    }
  };

  public readonly MODE: 'prod' | 'dev';
  public readonly AZURE_COSMOS_DB_KEY: string = optional;
  public readonly AZURE_COSMOS_DB_ENDPOINT: string = 'https://aurelia.documents.azure.com:443/';
  public readonly HTTP_SERVER_ROOT: string = './dist/';
  public readonly HTTP_SERVER_HOSTNAME: string = '0.0.0.0';
  public readonly HTTP_SERVER_PORT: string = '80';
  public readonly HTTP_SERVER_USEHTTP2: string = 'false';
  public readonly HTTP_SERVER_USEHTTPS: string = 'false';
  public readonly HTTP_SERVER_KEY: string = optional;
  public readonly HTTP_SERVER_CERT: string = optional;
  public readonly HTTP_SERVER_LOGLEVEL: string = 'info';
  public readonly HTTP_SERVER_RESPONSE_CACHE_CONTROL: string = 'no-store';

  public constructor(processEnv: Partial<ProcessEnv>) {

    const mode = this.MODE = processEnv.MODE ?? 'prod';
    if (mode !== 'dev' && mode !== 'prod') {
      throw new Error(`Cannot start server with unknown mode ${mode}.`);
    }
    console.log(`Starting the server in ${mode} mode.`);

    const schema = ProcessEnv.schemas[mode] ?? {};

    for (const name of ProcessEnv.names) {
      if (!(name in processEnv)) {
        if (schema[name] === required) {
          throw new Error(`Environment variable ${name} is required.`);
        }
      } else {
        this[name] = processEnv[name]!;
      }
    }
  }
}

export interface IFileServer extends FileServer { }
export const IFileServer = DI.createInterface<IFileServer>('IFileServer', x => x.cachedCallback(handler => {
  const opts = handler.get(IHttpServerOptions);
  const logger = handler.get(ILogger);

  return new FileServer(opts, logger);
}));

const $IStorage = DI.createInterface<IStorage>('IStorage');
type Handler = (ctx: IHttpContext) => Promise<void>;

function validateCommit(commit: undefined | string | string[]): asserts commit is string {
  if (commit === void 0) { return; }
  if (Array.isArray(commit)) {
    throw new NotSupportedError('Querying multiple commits not yet supported');
  }
  if (!/^[0-9a-f]{7,}$/i.test(commit)) {
    throw new NotSupportedError('Invalid commit hash');
  }
}

export class AppRequestHandler implements IRequestHandler {
  public constructor(
    @ILogger private readonly logger: ILogger,
    @IFileServer private readonly fs: IFileServer,
    @$IStorage private readonly storage: IStorage,
  ) {
    this.logger = logger.scopeTo('AppRequestHandler');
  }

  public async handleRequest(ctx: IHttpContext): Promise<void> {
    this.logger.debug(`handleRequest(pathname:${ctx.requestUrl.pathname},method:${ctx.request.method})`);

    switch (ctx.requestUrl.pathname) {
      // We eventually need route-recognizer here.
      case '/api/measurements':
        await this['/api/measurements'](ctx);
        break;
      case '/api/measurements/latest':
        await this['/api/measurements/latest'](ctx);
        break;
      default: {
        switch (ctx.request.method) {
          case 'GET':
            this.logger.debug(`handleRequest - deferring to file server`);

            if (ctx.requestUrl.path === '/') {
              ctx.requestUrl.path = 'index.html';
            }
            await this.fs.handleRequest(ctx);
            break;
          default:
            this.logger.debug(`handleRequest - rejecting method ${ctx.request.method}`);

            ctx.response.writeHead(HTTPStatusCode.MethodNotAllowed, {
              Allow: 'GET',
            });
            ctx.response.end();
            ctx.state = HttpContextState.end;
            break;
        }
      }
    }
  }

  private createHandler(endpoint: string, getData: (ctx: IHttpContext) => Promise<unknown>): Handler {
    return async (ctx: IHttpContext) => {
      try {
        switch (ctx.request.method) {
          case 'OPTIONS':
            this.respondOptions(ctx, endpoint);
            break;
          case 'GET': {
            this.logger.debug(`'${endpoint}' - returning data`);
            this.respond(HTTPStatusCode.OK, ctx, await getData(ctx));
            break;
          }
          default:
            this.notAllowed(ctx, endpoint);
            break;
        }
      } catch (e) {
        switch ((e as KnownError).code) {
          case 'NotSupported':
            this.respond(HTTPStatusCode.BadRequest, ctx, (e as KnownError).toResponseBody());
            break;
          default:
            if (e instanceof NotFoundError) {
              this.respond(HTTPStatusCode.BadRequest, ctx, { code: 'NotFound', message: e.message });
            } else {
              this.respond(HTTPStatusCode.BadRequest, ctx, e.message);
            }
            break;
        }
      }
    };
  }

  private readonly '/api/measurements': Handler = this.createHandler('/api/measurements', () => this.storage.getAllBenchmarkResults());
  private readonly '/api/measurements/latest': Handler = this.createHandler(
    '/api/measurements/latest',
    (ctx) => {
      // example: /api/measurements/latest?branch=foo&commit=f7b3d1
      const query = parse(ctx.requestUrl.query);
      const branch = query.branch ?? void 0;
      const commit = query.commit ?? void 0;
      if (Array.isArray(branch)) {
        throw new NotSupportedError('Querying multiple branches not yet supported');
      }
      validateCommit(commit);
      return this.storage.getLatestBenchmarkResult(branch, commit);
    }
  );

  private respondOptions(ctx: IHttpContext, endpoint: string) {
    this.logger.debug(`'${endpoint}' - handling preflight request`);

    ctx.response.writeHead(HTTPStatusCode.NoContent, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': '*',
    });
    ctx.response.end();
    ctx.state = HttpContextState.end;
  }

  private notAllowed(ctx: IHttpContext, endpoint: string) {
    this.logger.debug(`'${endpoint}' - rejecting method ${ctx.request.method}`);

    ctx.response.writeHead(HTTPStatusCode.MethodNotAllowed, {
      Allow: 'GET',
    });
    ctx.response.end();
    ctx.state = HttpContextState.end;
  }

  private respond(code: HTTPStatusCode, ctx: IHttpContext, data: unknown) {
    const content = Buffer.from(JSON.stringify(data), 'utf8');
    ctx.response.writeHead(code, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json; charset=utf-8',
    });
    ctx.response.end(content);
    ctx.state = HttpContextState.end;
  }
}

interface KnownError {
  code: 'NotSupported';
  toResponseBody(): unknown;
}
class NotSupportedError extends Error implements KnownError {
  public code: 'NotSupported' = 'NotSupported';
  public toResponseBody(): unknown {
    return { code: this.code, message: this.message };
  }
}

const container = DI.createContainer().register(
  Registration.instance(IPlatform, Platform.getOrCreate(globalThis)),
  LoggerConfiguration.create({ sinks: [ConsoleSink], level: LogLevel.debug }),
  Registration.cachedCallback(IHttpServerOptions, handler => {
    const processEnv = handler.get(IProcessEnv);
    return new HttpServerOptions(
      processEnv.HTTP_SERVER_ROOT,
      processEnv.HTTP_SERVER_HOSTNAME,
      Number(processEnv.HTTP_SERVER_PORT),
      processEnv.HTTP_SERVER_USEHTTP2 === 'true',
      processEnv.HTTP_SERVER_USEHTTPS === 'true',
      processEnv.HTTP_SERVER_KEY,
      processEnv.HTTP_SERVER_CERT,
      processEnv.HTTP_SERVER_LOGLEVEL as typeof HttpServerOptions.prototype.logLevel,
      processEnv.HTTP_SERVER_RESPONSE_CACHE_CONTROL,
    );
  }),
  Registration.cachedCallback($IStorage, (handler) => {
    const env = handler.get(IProcessEnv);
    const isProd = env.MODE === 'prod';
    return getNewStorageFor(
      /* storage */ isProd ? Storages.cosmos : Storages.json,
      /* options */ {
        resultRoot: isProd ? void 0 : join(process.cwd(), '..', '..', '.results'),
        cosmosEndpoint: env.AZURE_COSMOS_DB_ENDPOINT,
        cosmosKey: env.AZURE_COSMOS_DB_KEY
      },
    );
  }),
  Registration.singleton(IRequestHandler, AppRequestHandler),
  Registration.singleton(IHttpServer, HttpServer),
);

const server = container.get(IHttpServer);
void server.start();
