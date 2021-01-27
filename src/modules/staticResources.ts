import * as express from 'express';
import path from 'path';
import favicon from 'serve-favicon';

/**
 * Serve static resources
 * ------------------------------
 * Static resources are in /public
 */
export const configureStaticResourcesHandler = async (app: express.Application): Promise<void> => {
    app
        // Serve static files like images from the public folder
        .use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }))

        // A favicon is a visual cue that client software, like browsers, use to identify a site
        .use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')));
};
