import { IDataFrame } from 'data-forge';
import { isEmptyOrSpaces } from './utils';

export const loadStudies = (studies: IDataFrame, participants: IDataFrame): IDataFrame => {
    return studies
        .joinOuterLeft(
            participants,
            (left) => left.study_id,
            (right) => right.study_id,
            (left, right) => {
                return {
                    ...left,
                    ...right,
                };
            }
        )
        .groupBy((row) => row.study_id)
        .select((group) => {
            return struct('participants', Object.keys(participants.first()), 'submitter_participant_id', group);
        })
        .inflate();
};

export const loadParticipants = (
    participants: IDataFrame,
    biospecimens: IDataFrame,
    familyRelationships: IDataFrame,
    familyHistories: IDataFrame,
    exposures: IDataFrame,
    diagnoses: IDataFrame
): IDataFrame => {
    const join1 = biospecimens
        ? participants
              .joinOuterLeft(
                  biospecimens,
                  (left) => left.submitter_participant_id,
                  (right) => right.submitter_participant_id,
                  (left, right) => {
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_participant_id)
              .select((group) => {
                  return struct(
                      'biospecimens',
                      Object.keys(biospecimens.first()).filter(
                          (key) => !['study_id', 'submitter_participant_id'].includes(key)
                      ),
                      'submitter_biospecimen_id',
                      group
                  );
              })
              .inflate()
        : participants;

    const join2 = familyRelationships
        ? join1
              .joinOuterLeft(
                  familyRelationships,
                  (left) => left.submitter_family_id,
                  (right) => right.submitter_family_id,
                  (left, right) => {
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_family_id)
              .select((group) => {
                  return struct(
                      'family',
                      Object.keys(familyRelationships.first()).filter((key) => !['study_id', 'gender'].includes(key)),
                      'submitter_family_id',
                      group
                  );
              })
              .inflate()
        : join1;

    const join3 = familyHistories
        ? join2
              .joinOuterLeft(
                  familyHistories,
                  (left) => left.submitter_participant_id,
                  (right) => right.submitter_participant_id,
                  (left, right) => {
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_participant_id)
              .select((group) => {
                  return struct(
                      'family_history',
                      Object.keys(familyHistories.first()).filter(
                          (key) => !['study_id', 'submitter_participant_id'].includes(key)
                      ),
                      'submitter_family_condition_id',
                      group
                  );
              })
              .inflate()
        : join2;

    const join4 = exposures
        ? join3
              .joinOuterLeft(
                  exposures,
                  (left) => left.submitter_participant_id,
                  (right) => right.submitter_participant_id,
                  (left, right) => {
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_participant_id)
              .select((group) => {
                  return struct(
                      'exposures',
                      Object.keys(exposures.first()).filter((key) => !['study_id', 'submitter_participant_id'].includes(key)),
                      'smoking_status',
                      group
                  );
              })
              .inflate()
        : join3;

    const join5 = diagnoses
        ? join4
              .joinOuterLeft(
                  diagnoses,
                  (left) => left.submitter_participant_id,
                  (right) => right.submitter_participant_id,
                  (left, right) => {
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_participant_id)
              .select((group) => {
                  return struct(
                      'diagnoses',
                      Object.keys(diagnoses.first()).filter((key) => !['study_id', 'submitter_participant_id'].includes(key)),
                      'submitter_diagnosis_id',
                      group
                  );
              })
              .inflate()
        : join4;

    return join5;
};

export const loadBiospecimens = (biospecimen: IDataFrame, samples: IDataFrame): IDataFrame => {
    return samples
        ? biospecimen
              .joinOuterLeft(
                  samples,
                  (left) => left.submitter_biospecimen_id,
                  (right) => right.submitter_biospecimen_id,
                  (left, right) => {
                      // this will eliminate the key duplicates
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_biospecimen_id)
              .select((group) => {
                  return struct('samples', ['submitter_sample_id', 'sample_type'], 'submitter_biospecimen_id', group);
              })
              .inflate()
        : biospecimen;
};

export const loadDiagnoses = (diagnoses: IDataFrame, treatments: IDataFrame, followups: IDataFrame): IDataFrame => {
    const join1 = treatments
        ? diagnoses
              .joinOuterLeft(
                  treatments,
                  (left) => left.submitter_diagnosis_id,
                  (right) => right.submitter_diagnosis_id,
                  (left, right) => {
                      // this will eliminate the key duplicates
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_diagnosis_id)
              .select((group) => {
                  return struct(
                      'treatments',
                      Object.keys(treatments.first()).filter(
                          (key) => !['study_id', 'submitter_participant_id', 'submitter_diagnosis_id'].includes(key)
                      ),
                      'submitter_treatment_id',
                      group
                  );
              })
              .inflate()
        : diagnoses;

    const join2 = followups
        ? join1
              .joinOuterLeft(
                  followups,
                  (left) => left.submitter_diagnosis_id,
                  (right) => right.submitter_diagnosis_id,
                  (left, right) => {
                      // this will eliminate the key duplicates
                      return {
                          ...left,
                          ...right,
                      };
                  }
              )
              .groupBy((row) => row.submitter_diagnosis_id)
              .select((group) => {
                  return struct(
                      'follow_ups',
                      Object.keys(followups.first()).filter(
                          (key) => !['study_id', 'submitter_participant_id', 'submitter_diagnosis_id'].includes(key)
                      ),
                      'submitter_follow-up_id',
                      group
                  );
              })
              .inflate()
        : join1;

    return join2;
};

// The successfulJoinIndicatorColumn is to help determine if a left join returned any nested elements
// Basically, the successfulJoinIndicatorColumn is a column that is unique to the entity - the PK for instance.
export const struct = (
    nestedStructureName: string,
    nestedStructureColumns: string[],
    successfulJoinIndicatorColumn: string,
    df: IDataFrame
): any => {
    const result: { [key: string]: any } = {};

    // Add all the columns resulting from the join in the parent object
    Object.keys(df.first())
        .filter((key) => !nestedStructureColumns.includes(key))
        .forEach((key) => {
            result[key] = df.first()[key];
        });

    // Check if left join returned values
    const valuesFound = df
        .select((row) => row[successfulJoinIndicatorColumn])
        .toArray()
        .filter((value) => !isEmptyOrSpaces(value));

    // Add the list of nested objects to the parent
    const nestedStructure =
        valuesFound.length === 0
            ? []
            : df
                  .deflate((row) => {
                      const nested: { [key: string]: any } = {};
                      nestedStructureColumns.forEach((col) => {
                          const val = row[col];
                          nested[col] = val;
                      });
                      return nested;
                  })
                  .toArray();

    result[nestedStructureName] = nestedStructure;

    return result;
};
