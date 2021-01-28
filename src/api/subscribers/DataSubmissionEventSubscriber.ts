import { EventSubscriber, On } from 'event-dispatch';

import { Logger } from '../../lib/logger';
import { events } from './events';
import { DataSubmission } from '../models/DataSubmission';

const log = new Logger(__filename);

@EventSubscriber()
export class DataSubmissionEventSubscriber {
    @On(events.dataSubmission.created)
    public onDataSubmissionInitiated(dataSubmission: DataSubmission): void {
        log.info('DataSubmission ' + dataSubmission.id + ' created!');
    }
}
