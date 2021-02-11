import latinizer from 'latinize';
import { entities as dictionaryEntities } from '@overturebio-stack/lectern-client';

export const selectSchema = async (
    filename: string,
    dictionary: dictionaryEntities.SchemasDictionary
): Promise<string> => {
    const filenameWithoutExtension = filename.substring(0, filename.indexOf('.'));
    const cleanedFileName = sanitize(filenameWithoutExtension);

    return dictionary.schemas.find((schema) => {
        return sanitize(schema.name) === cleanedFileName;
    }).name;
};

export const isEmptyOrSpaces = (str: string): boolean => {
    return !str || str.trim() === '';
};

export const sanitize = (str: string): string => {
    const latinizedFilename = latinizer(str);

    let noSpecialChars = latinizedFilename.replace(/[^a-zA-Z]/g, '');

    while (noSpecialChars.endsWith('_')) {
        noSpecialChars = noSpecialChars.substring(0, noSpecialChars.length - 1);
    }

    return noSpecialChars.toLowerCase().trim();
};
