import * as dataForge from 'data-forge';
import path from 'path';
import fs from 'fs';
import { loadBiospecimens, loadDiagnoses, loadDonors, loadStudies } from '../../../src/api/dataframeUtils';

describe('Select, join, group, aggregate', () => {
    test('Load studies with all dependencies', async (done) => {
        // Load CSVs
        const studyCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/study.csv'));
        const donorCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/donor.csv'));
        const familyHistoryCSV = fs.readFileSync(
            path.resolve(__dirname, '../../resources/dataframes/family-history.csv')
        );
        const familyRelationshipCSV = fs.readFileSync(
            path.resolve(__dirname, '../../resources/dataframes/family-relationship.csv')
        );
        const exposureCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/exposure.csv'));
        const biospecimenCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/biospecimen.csv'));
        const sampleCSV = fs.readFileSync(
            path.resolve(__dirname, '../../resources/dataframes/sample_registration.csv')
        );
        const diagnosisCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/diagnosis.csv'));
        const treatmentCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/treatment.csv'));
        const followupCSV = fs.readFileSync(path.resolve(__dirname, '../../resources/dataframes/follow-up.csv'));

        // Load CSV into Dataframes
        const studies = dataForge.fromCSV(studyCSV.toString('utf-8'));
        const donors = dataForge.fromCSV(donorCSV.toString('utf-8'));
        const familyHistories = dataForge.fromCSV(familyHistoryCSV.toString('utf-8'));
        const familyRelationships = dataForge.fromCSV(familyRelationshipCSV.toString('utf-8'));
        const exposures = dataForge.fromCSV(exposureCSV.toString('utf-8'));
        const biospecimen = dataForge.fromCSV(biospecimenCSV.toString('utf-8'));
        const samples = dataForge.fromCSV(sampleCSV.toString('utf-8'));
        const diagnoses = dataForge.fromCSV(diagnosisCSV.toString('utf-8'));
        const treatments = dataForge.fromCSV(treatmentCSV.toString('utf-8'));
        const followups = dataForge.fromCSV(followupCSV.toString('utf-8'));

        // Join dependencies
        const biospecimenWithDeps = loadBiospecimens(biospecimen, samples);
        const diagnosesWithDeps = loadDiagnoses(diagnoses, treatments, followups);
        const donorsWithDeps = loadDonors(
            donors,
            biospecimenWithDeps,
            familyRelationships,
            familyHistories,
            exposures,
            diagnosesWithDeps
        );

        // Assemble study
        const df = loadStudies(studies, donorsWithDeps);
        const studiesWithDeps = df.toJSON();

        // TODO: validations on studiesWithDeps
        console.log(studiesWithDeps);

        done();
    });
});
