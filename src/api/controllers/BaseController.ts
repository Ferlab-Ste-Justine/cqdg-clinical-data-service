import { LecternService } from '../services/LecternService';
import { env } from '../../env';

export abstract class BaseController {
    protected async fetchDictionary(
        request: any,
        lecternService: LecternService,
        dictionaryVersion: string = undefined
    ): Promise<any> {
        let lang = request.acceptsLanguages('fr', 'en').toUpperCase();
        lang = env.lectern.dictionaryDefaultLanguage === lang ? '' : lang;
        const dictionaryName = `${env.lectern.dictionaryName} ${lang}`.trim();

        return dictionaryVersion
            ? await lecternService.fetchDictionary(dictionaryName, dictionaryVersion)
            : await lecternService.fetchLatestDictionary(lang);
    }
}
