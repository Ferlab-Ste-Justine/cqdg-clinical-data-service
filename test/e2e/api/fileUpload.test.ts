import { bootstrapApp, BootstrapSettings, startMinio, stopMinio } from '../utils/bootstrap';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import axios from 'axios';
import FormData from 'form-data';
import { env } from '../../../src/env';
import { getAuthToken } from '../../utils/helpers';

describe('/api', () => {
    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------
    console.error = () => {
        // The console.error in lectern-client are too verbose.
    };

    let settings: BootstrapSettings;
    let dataSubmissionId: number;
    let authToken: string;

    const getHeaders = (form: FormData = undefined): any => {
        const headers = form ? form.getHeaders() : {};
        headers.Authorization = `Bearer ${authToken}`;
        return headers;
    };

    const loadSamples = async () => {
        /*const form = new FormData();
        form.append('file', fs.createReadStream(path.resolve(__dirname, '../../resources/sample_registration.csv')));

        try {
            const response = await axios.post('http://localhost:' + env.app.port + `/api/upload/samples`, form, {
                headers: getHeaders(form),
            });
            dataSubmissionId = response.data.dataSubmissionId;
        } catch (err) {
            fail(`Failed to load test registration sample.\n\r${JSON.stringify(err, undefined, 2)}`);
        }*/

        try {
            const response = await request(settings.app)
                .post(`/api/upload/samples`)
                .set('Accept', 'text/tab-separated-values')
                .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
                .set('Accept-Language', 'en')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', fs.createReadStream(path.resolve(__dirname, '../../resources/sample_registration.csv')))
                .expect(200);

            dataSubmissionId = response.body.dataSubmissionId;
        } catch (err) {
            fail(err);
        }
    };

    beforeAll(async (done) => {
        settings = await bootstrapApp();

        await startMinio();

        authToken = await getAuthToken();
        if (!authToken) {
            fail('Failed to acquire auth token.');
        }

        await loadSamples();

        done();
    });

    afterAll(async () => {
        await stopMinio();
    });

    // -------------------------------------------------------------------------
    // Test cases
    // -------------------------------------------------------------------------

    test.skip('POST: /api/upload/clinical-data should return validation errors - axios example', async (done) => {
        const form = new FormData();
        form.append('files', fs.createReadStream(path.resolve(__dirname, '../../resources/biospecimen.tsv')));
        form.append('files', fs.createReadStream(path.resolve(__dirname, '../../resources/donor.tsv')));

        axios
            .post('http://localhost:' + env.app.port + `/api/upload/clinical-data/${dataSubmissionId}`, form, {
                headers: getHeaders(form),
            })
            .then((response) => {
                expect(response.status).toEqual(400);
                expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
            })
            .catch((error) => {
                expect(error.response.status).toEqual(400);
                expect(error.response.headers['content-type']).toEqual('application/json; charset=utf-8');
            })
            .finally(() => done());
    });

    test('POST: /api/upload/clinical-data should return validation errors', async (done) => {
        await request(settings.app)
            .post(`/api/upload/clinical-data/${dataSubmissionId}`)
            .set('Accept', 'text/tab-separated-values')
            .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
            .set('Accept-Language', 'en')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('files', fs.createReadStream(path.resolve(__dirname, '../../resources/biospecimen.tsv')))
            .attach('files', fs.createReadStream(path.resolve(__dirname, '../../resources/donor.tsv')))
            .expect(400)
            .expect('Content-Type', /json/);

        done();
    });

    test('POST: /api/upload/clinical-data should crash because no files', async (done) => {
        await request(settings.app)
            .post(`/api/upload/clinical-data/${dataSubmissionId}`)
            .set('Accept', 'text/tab-separated-values')
            .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
            .set('Accept-Language', 'en')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(400);
        done();
    });
});
