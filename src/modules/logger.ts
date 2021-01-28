import { configure, format, transports } from 'winston';
import { env } from '../env';

/**
 * Winston Logger
 * ------------------------------
 */
// Workaround for forgotten console.error in lectern-client
if (env.isDevelopment) {
    console.error = () => {
        // The console.error in lectern-client are too verbose.
    };
}

export const configureLogger = () =>
    configure(
        env.isTest
            ? {
                  transports: [
                      new transports.Console({
                          level: 'none',
                          handleExceptions: false,
                      }),
                  ],
              }
            : {
                  transports: [
                      new transports.Console({
                          level: env.log.level,
                          handleExceptions: true,
                          format:
                              env.node !== 'development'
                                  ? format.combine(format.json())
                                  : format.combine(format.colorize(), format.simple()),
                      }),
                  ],
              }
    );
