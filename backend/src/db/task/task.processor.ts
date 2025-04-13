import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as XLSX from 'xlsx';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Reservation } from '../reservation/reservation.schema';
import { TASK_QUEUE_NAME, TaskStatus } from './task.consts';
import { plainToInstance } from 'class-transformer';
import { ReservationDto } from '../reservation/dto/reservation.dto';
import { validateSync } from 'class-validator';
import { Task } from './task.schema';
import { ReservationStatus } from '../reservation/reservation.consts';
import { ValidationError } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface TaskProcessorData {
    taskId: string;
    filePath: string;
}

@Processor(TASK_QUEUE_NAME)
export class TaskProcessor extends WorkerHost {
    constructor(
        @InjectModel(Reservation.name)
        private readonly reservationModel: Model<Reservation>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
    ) {
        super();
    }

    async process(job: Job<TaskProcessorData>): Promise<void> {
        const { filePath, taskId } = job.data;
        const session = await this.reservationModel.db.startSession();

        await session.startTransaction();

        try {
            // I don't think SheetJS supports streaming, so we have to load the whole file into memory
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // It's possible to iterate over chunks with range attribute, but first we would have to process
            // it for error detection and then we would have to do it again for actual business logic
            const jsonSheet = XLSX.utils.sheet_to_json(sheet);

            const reservations: ReservationDto[] = plainToInstance(ReservationDto, jsonSheet);

            const errors = await this.validateReservations(reservations);

            if (errors.length > 0) {
                console.error('Validation errors:', errors.length, errors);
                const reportPath = await this.generateReport(errors);
                await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.FAILED, errorReportPath: reportPath });
                return;
            }

            await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.IN_PROGRESS }, { session }).exec();
            await this.processReservations(session, reservations);
            await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.COMPLETED }, { session }).exec();
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.FAILED }).exec();
            console.error('Error processing XLSX file:', error);
            throw error;
        }
    }

    async processReservations(session: ClientSession, reservations: ReservationDto[]) {
        for (const newReservation of reservations) {
            const reservation = await this.reservationModel.findOne({ reservationId: newReservation.reservationId }, undefined, {
                session,
            });

            if (reservation && (ReservationStatus.CANCELLED || ReservationStatus.COMPLETED)) {
                reservation.status = newReservation.status;
                await reservation.save({ session });
            } else {
                await this.reservationModel
                    .findOneAndUpdate({ reservationId: newReservation.reservationId }, newReservation, {
                        upsert: true,
                        session,
                    })
                    .exec();
            }
        }
    }

    async validateReservations(reservations: ReservationDto[]) {
        return reservations
            .map((reservation, id) => ({
                row: id,
                errors: validateSync(reservation, { forbidNonWhitelisted: true }),
            }))
            .filter((reservation) => reservation.errors.length > 0);
    }

    async generateReport(reservations: { row: number; errors: ValidationError[] }[]): Promise<string> {
        const report = reservations.map((reservation) => {
            const reasons = reservation.errors.map((error) => {
                const constraints = error.constraints ? Object.values(error.constraints).join(', ') : 'Unknown validation error';
                return {
                    field: error.property,
                    message: constraints,
                };
            });

            return {
                row: reservation.row + 1, // Adjusting for 1-based index in Excel
                reasons,
            };
        });

        const workbook = XLSX.utils.book_new();
        const worksheetData = report.map((entry) => ({
            Row: entry.row,
            Issues: entry.reasons.map((reason) => reason.message).join('; '),
            Suggestions: entry.reasons
                .map((reason) => {
                    if (reason.message.includes('format')) {
                        return `${reason.field}: Check the format of the field`;
                    } else if (reason.message.includes('missing')) {
                        return `${reason.field}: Ensure the field is provided`;
                    } else {
                        return `${reason.field}: Make sure the field is correct`;
                    }
                })
                .join('; '),
        }));

        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Report');

        const reportFilePath = `${process.cwd()}\\errorReports\\${randomUUID()}.xlsx`;
        console.log(reportFilePath);
        XLSX.writeFile(workbook, reportFilePath, { bookType: 'xlsx', type: 'binary' });

        console.log(`Error report generated: ${reportFilePath}`);

        return reportFilePath;
    }
}
