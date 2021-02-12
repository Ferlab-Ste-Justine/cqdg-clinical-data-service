import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { Engine, EngineResult } from 'json-rules-engine';
import { customOperators } from '../ruleEngineCustomOperators';
import { RecordValidationError } from '../controllers/responses/RecordValidationError';
import { SchemaValidationErrorTypes } from '@overturebio-stack/lectern-client/lib/schema-entities';

@Service()
export class RulesService {
    constructor(@Logger(__filename) private log: LoggerInterface) {}

    public async fireAllRules(rules: any[], facts: any[]): Promise<RecordValidationError[]> {
        this.log.debug('RulesService.fireAllRules');

        const errors: RecordValidationError[] = [];
        const engine: Engine = new Engine();

        // Load rules fetched from S3
        rules.forEach((rule) => engine.addRule(rule));

        Object.keys(customOperators).forEach((key) => {
            engine.addOperator(key, customOperators[key]);
        });

        for (const fact of facts) {
            const result: EngineResult = await engine.run(fact);

            if (result.failureResults && result.failureResults.length > 0) {
                result.failureResults.forEach((ruleResult) => {
                    const error = new RecordValidationError({});
                    error.message = ruleResult.name + (ruleResult.event ? ' : ' + ruleResult.event.type : '');
                    error.errorType = SchemaValidationErrorTypes.INVALID_BY_SCRIPT;
                    error.info = {
                        conditions: JSON.stringify(ruleResult.conditions),
                        result: JSON.stringify(ruleResult.result),
                    };
                    errors.push(error);
                });
            }
        }

        return errors;
    }
}
