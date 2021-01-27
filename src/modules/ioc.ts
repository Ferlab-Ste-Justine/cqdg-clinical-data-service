import {useContainer as routingUseContainer} from 'routing-controllers/container';
import {Container as iocContainer} from 'typedi';
import {useContainer as classValidatorUseContainer} from 'class-validator/container';
import {useContainer as ormUseContainer} from 'typeorm';

/**
 * IOC
 * ------------------------------
 */
export const configureIOC = () => {
    routingUseContainer(iocContainer);
    ormUseContainer(iocContainer);
    classValidatorUseContainer(iocContainer);
};
