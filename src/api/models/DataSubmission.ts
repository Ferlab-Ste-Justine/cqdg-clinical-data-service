/*
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of the GNU Affero General Public License v3.0.
 * You should have received a copy of the GNU Affero General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 */

import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Status } from './ReferentialData';
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { AuditEntity } from './AuditEntity';
import { SampleRegistration } from './SampleRegistration';
import { UploadReport } from '../controllers/responses/UploadReport';
import { DbAwareColumn } from '../../decorators/DBAwareColumn';
import { Type } from 'class-transformer';

@Entity({
    name: 'data_submission',
})
export class DataSubmission extends AuditEntity {
    @IsNumber()
    @PrimaryGeneratedColumn('increment')
    public id: number;

    @IsNotEmpty()
    @Column({
        type: 'varchar',
    })
    public status: Status;

    @ValidateNested({ each: true })
    @Type(() => UploadReport)
    @DbAwareColumn({
        name: 'status_report',
        type: 'json',
        nullable: true,
    })
    public statusReport: UploadReport;

    @OneToMany((type) => SampleRegistration, (sampleRegistration) => sampleRegistration.dataSubmission)
    public registeredSamples: SampleRegistration[];
}
