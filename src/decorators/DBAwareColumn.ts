import { Column, ColumnOptions, ColumnType } from 'typeorm';
import { env } from '../env';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#examples
const circularDependenciesReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

const typeMapping: { [key: string]: ColumnOptions } = {
    json: {
        type: 'text',
        transformer: {
            to: (value?: any) => (!value ? value : JSON.stringify(value, circularDependenciesReplacer())),
            from: (value?: any) => (!value ? value : JSON.parse(value)),
        },
    },
};

const resolveDbType = (sourceType: ColumnType): ColumnOptions => {
    if (env.isTest && sourceType.toString() in typeMapping) {
        return typeMapping[sourceType.toString()];
    }
    return undefined;
};

export function DbAwareColumn(options: ColumnOptions): PropertyDecorator {
    if (options && options.type) {
        const columnOptionsOverrides: ColumnOptions = resolveDbType(options.type);
        if (columnOptionsOverrides) {
            options.type = columnOptionsOverrides.type;

            if (columnOptionsOverrides.transformer) {
                options.transformer = columnOptionsOverrides.transformer;
            }
        }
    }
    return Column(options);
}
