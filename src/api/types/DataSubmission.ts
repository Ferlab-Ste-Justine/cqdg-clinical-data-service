import { Field, ID, ObjectType } from 'type-graphql';

import { SampleRegistration } from './SampleRegistration';

@ObjectType({
    description: 'Data submission object.',
})
export class DataSubmission {
    @Field((type) => ID)
    public id: number;

    @Field({
        description: 'The status of the data submission process.',
    })
    public status: string;

    @Field((type) => [SampleRegistration], {
        description: 'A list of registered samples for the current data submission process.',
    })
    public registeredSamples: SampleRegistration[];
}
