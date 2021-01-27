import {Field, InputType} from 'type-graphql';

import {SampleRegistration} from '../SampleRegistration';

@InputType()
export class SampleRegistrationInput implements Partial<SampleRegistration> {

    @Field()
    public dataSubmissionId: string;

    @Field()
    public studyId: string;

}
