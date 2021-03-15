import {
    Authorized,
    CurrentUser,
    Delete,
    Get,
    JsonController,
    NotFoundError,
    Param,
    Post,
    Req,
    Res,
    UnauthorizedError,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { DataSubmission } from '../models/DataSubmission';
import { User } from '../models/ReferentialData';
import { DataSubmissionService } from '../services/DataSubmissionService';
import { Study } from '../models/Study';
import { StudyService } from '../services/StudyService';
import { BaseController } from './BaseController';
import { LecternService } from '../services/LecternService';

@Authorized()
@JsonController()
@OpenAPI({})
// @OpenAPI({ security: [{ cqdgAuth: [] }] })
export class StudyController extends BaseController {
    constructor(
        private studyService: StudyService,
        private lecternService: LecternService,
        private dataSubmissionService: DataSubmissionService,
        @Logger(__filename) private log: LoggerInterface
    ) {
        super();
    }

    /**
     * @param user
     *
     * @returns List of studies with their versions
     */
    @Get('/studies')
    public async listStudies(@Req() request: any, @Res() response: any, @CurrentUser() user: User): Promise<Study[]> {
        const studies: Study[] = await this.studyService.findBy({ createdBy: user.id }, true);

        if (!studies || studies.length === 0) {
            this.log.debug(`No studies found for user ${user.id}`);
            response.status(404);
        }

        return studies;
    }

    /**
     * Step 1a - Create a new study and initialize its first version (data submission)
     *
     * @param study code
     * @param user
     *
     * @returns Data submission id (aka.: version of study)
     */
    @Post('/study/:code')
    public async create(@Param('code') code: string, @Req() request: any, @CurrentUser() user: User): Promise<Study> {
        const study: Study = new Study();
        study.code = code;
        study.createdBy = user.id;

        const dataSubmission: DataSubmission = new DataSubmission();
        dataSubmission.createdBy = user.id;

        const schemas = await this.fetchDictionary(request, this.lecternService);
        dataSubmission.dictionaryVersion = schemas.version;

        study.dataSubmissions = [dataSubmission];

        const savedStudy: Study = await this.studyService.create(study);
        return savedStudy;
    }

    /**
     * Step 1b - Create a version for an existing study
     *
     * @param code
     * @param user
     *
     * @returns Data submission id (aka.: version of study)
     */
    @Post('/study/:studyId/version')
    public async createStudyVersion(
        @Param('studyId') studyId: number,
        @Req() request: any,
        @CurrentUser() user: User
    ): Promise<DataSubmission> {
        const study: Study = await this.studyService.findOne(studyId);

        if (!(await this.isAllowed(user, study))) {
            throw new UnauthorizedError(
                `User ${user.id} not allowed to create a new version for the study with id: ${studyId}`
            );
        }

        const dataSubmission: DataSubmission = new DataSubmission();
        dataSubmission.createdBy = user.id;
        dataSubmission.studyId = study.id;
        dataSubmission.study = study;

        const schemas = await this.fetchDictionary(request, this.lecternService);
        dataSubmission.dictionaryVersion = schemas.version;

        const savedDataSubmission: DataSubmission = await this.dataSubmissionService.create(dataSubmission);
        savedDataSubmission.study = undefined;
        return savedDataSubmission;
    }

    @Delete('/study/:id')
    public async delete(@Param('id') id: number, @CurrentUser() user: User, @Res() response: any): Promise<number> {
        if (!(await this.isAllowed(user, id))) {
            throw new UnauthorizedError(`User ${user.id} not allowed to delete study ${id}`);
        }

        try {
            await this.studyService.delete(id);
        } catch (err3) {
            throw new NotFoundError(`No study with id ${id}.`);
        }

        return id;
    }

    private async isAllowed(user: User, study: number | Study): Promise<boolean> {
        if (!(study instanceof Study)) {
            study = await this.studyService.findOne(study);
        }
        return user.id === study.createdBy;
    }
}
