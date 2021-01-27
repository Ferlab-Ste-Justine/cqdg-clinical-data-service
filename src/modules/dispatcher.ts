import {env} from '../env';
import glob from 'glob';

/**
 * Event Dispatcher
 * ------------------------------
 * Dynamically load the subscribers into the project.
 */
export const configureEventDispatcher = () => {
    const patterns = env.app.dirs.subscribers;
    patterns.forEach((pattern) => {
        glob(pattern, (err: any, files: string[]) => {
            for (const file of files) {
                require(file);
            }
        });
    });
};
