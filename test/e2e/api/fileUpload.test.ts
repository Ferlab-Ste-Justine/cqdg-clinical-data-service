import { bootstrapApp, BootstrapSettings } from '../utils/bootstrap';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import axios from 'axios';
import FormData from 'form-data';
import { env } from '../../../src/env';

describe('/api', () => {
    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------

    let settings: BootstrapSettings;
    beforeAll(async () => (settings = await bootstrapApp()));

    // -------------------------------------------------------------------------
    // Test cases
    // -------------------------------------------------------------------------

    test.skip('POST: /api/upload should return validation errors - axios example', async (done) => {
        const form = new FormData();
        form.append('files', fs.createReadStream(path.resolve(__dirname, '../../resources/biospecimen.tsv')));
        form.append('files', fs.createReadStream(path.resolve(__dirname, '../../resources/donor.tsv')));

        axios
            .post('http://localhost:' + env.app.port + '/api/upload', form, {
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

    test('POST: /api/upload should return validation errors', async (done) => {
        await request(settings.app)
            .post('/api/upload')
            .set('Accept', 'text/tab-separated-values')
            .set('Content-Type', 'text/tab-separated-values; charset=utf-8')
            .set('Accept-Language', 'en')
            .attach('files', fs.createReadStream(path.resolve(__dirname, '../../resources/biospecimen.tsv')))
            .attach('files', fs.createReadStream(path.resolve(__dirname, '../../resources/donor.tsv')))
            .expect(400)
            .expect('Content-Type', /json/);

        done();
    });

    test('POST: /api/upload should crash because no files', async (done) => {
        await request(settings.app).post('/api/upload').expect(400);

        done();
    });
});
