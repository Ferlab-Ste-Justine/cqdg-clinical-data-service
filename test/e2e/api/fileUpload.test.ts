import { bootstrapApp, BootstrapSettings } from '../utils/bootstrap';
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
    let formDataOptions: any;

    const loadSamples = async () => {
        const form = new FormData();
        form.append(
            'file',
            fs.createReadStream(path.resolve(__dirname, '../../resources/sample_registration.csv')),
            formDataOptions
        );

        axios
            .post('http://localhost:' + env.app.port + `/api/upload/samples`, form, {
                headers: form.getHeaders(),
            })
            .then((response) => {
                console.log(`Sample registration loaded with id ${response.data.dataSubmissionId}`);
                dataSubmissionId = response.data.dataSubmissionId;
            })
            .catch((error) => {
                throw error;
            });
    };

    beforeAll(async () => {
        settings = await bootstrapApp();
        await loadSamples();

        const authToken: string = await getAuthToken();
        formDataOptions = {
            header: {
                Authorization: `Bearer ${authToken}`,
            },
        };
    });

    // -------------------------------------------------------------------------
    // Test cases
    // -------------------------------------------------------------------------

    /*test('POST: /api/upload/samples should return validation errors', async (done) => {
        await request(settings.app)
            .post('/api/upload/clinical-data')
            .set('Accept', 'text/tab-separated-values')
            .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
            .set('Accept-Language', 'en')
            .attach('files', fs.createReadStream(path.resolve(__dirname, '../../resources/sample_registration.csv')))
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                console.log(JSON.stringify(err, undefined, 2));
                console.log(JSON.stringify(res, undefined, 2));
            });

        done();
    });*/

    test.skip('POST: /api/upload/clinical-data should return validation errors - axios example', async (done) => {
        const form = new FormData();
        form.append(
            'files',
            fs.createReadStream(path.resolve(__dirname, '../../resources/biospecimen.tsv')),
            formDataOptions
        );
        form.append(
            'files',
            fs.createReadStream(path.resolve(__dirname, '../../resources/donor.tsv')),
            formDataOptions
        );

        axios
            .post('http://localhost:' + env.app.port + `/api/upload/clinical-data/${dataSubmissionId}`, form, {
                headers: form.getHeaders(),
            })
            .then((response) => {
                expect(response.status).toEqual(400);
                expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
                done();
            })
            .catch((error) => {
                expect(error.response.status).toEqual(400);
                expect(error.response.headers['content-type']).toEqual('application/json; charset=utf-8');
                done();
            });
    });

    test('POST: /api/upload/clinical-data should return validation errors', async (done) => {
        await request(settings.app)
            .post(`/api/upload/clinical-data/${dataSubmissionId}`)
            .set('Accept', 'text/tab-separated-values')
            .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
            .set('Accept-Language', 'en')
            .set('Authorization', formDataOptions.header.Authorization)
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
            .expect(400);
        done();
    });
});
