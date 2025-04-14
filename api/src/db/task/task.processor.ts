import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, ValidationError } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { ClientSession, Model } from 'mongoose';
import { TASK_QUEUE_NAME, TaskStatus } from './task.consts';
import { Task } from './task.schema';
import { Reservation } from '../reservation/reservation.schema';
import { ReservationDto } from '../reservation/dto/reservation.dto';
import { ReservationStatus } from '../reservation/reservation.consts';

export interface TaskProcessorData {
    taskId: string;
    filePath: string;
}

@Processor(TASK_QUEUE_NAME)
export class TaskProcessor extends WorkerHost {
    private readonly logger = new Logger(TaskProcessor.name);

    constructor(
        @InjectModel(Reservation.name)
        private readonly reservationModel: Model<Reservation>,
        @InjectModel(Task.name)
        private readonly taskModel: Model<Task>,
    ) {
        super();
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<TaskProcessorData>) {
        this.logger.error(`Task with ID: ${job.data.taskId} failed with error: ${job.failedReason}`);
    }

    async process(job: Job<TaskProcessorData>) {
        const { filePath, taskId } = job.data;

        this.logger.log(`Processing task with ID: ${taskId}`);
        const session = await this.reservationModel.db.startSession();
        await session.startTransaction();

        try {
            // I don't think that SheetJS library supports streaming
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // This could be broken into chunks using range attribute, but we would have to load it twice:
            // once for validation and once for processing
            const jsonSheet = XLSX.utils.sheet_to_json(sheet);
            const reservations: ReservationDto[] = plainToInstance(ReservationDto, jsonSheet);

            const errors = this.validateReservations(reservations);

            if (errors.length > 0) {
                const reportPath = this.generateReport(errors);
                this.logger.error(`Validation failed. Report generated at: ${reportPath}`);
                await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.FAILED, errorReportPath: reportPath });
                return;
            }

            await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.IN_PROGRESS }, { session }).exec();
            await this.processReservations(session, reservations);
            await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.COMPLETED }, { session }).exec();

            await session.commitTransaction();
            this.logger.log(`Task with ID: ${taskId} completed.`);
        } catch (error) {
            await session.abortTransaction();
            await this.taskModel.findOneAndUpdate({ taskId }, { status: TaskStatus.FAILED }).exec();

            throw error;
        }
    }

    async processReservations(session: ClientSession, reservations: ReservationDto[]) {
        for (const newReservation of reservations) {
            const reservation = await this.reservationModel.findOne({ reservationId: newReservation.reservationId }, undefined, {
                session,
            });

            if (ReservationStatus.CANCELLED || ReservationStatus.COMPLETED) {
                if (!reservation) continue;

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

    validateReservations(reservations: ReservationDto[]) {
        return reservations
            .map((reservation, id) => ({
                row: id,
                errors: validateSync(reservation, { forbidNonWhitelisted: true }),
            }))
            .filter((reservation) => reservation.errors.length > 0);
    }

    // with more effort it could be moved to a separate Excel service
    generateReport(reservations: { row: number; errors: ValidationError[] }[]): string {
        const report = reservations.map((reservation) => {
            const reasons = reservation.errors.map((error) => {
                const constraints = error.constraints ? Object.values(error.constraints).join(', ') : 'Unknown validation error';
                return {
                    field: error.property,
                    message: constraints,
                };
            });

            return {
                row: reservation.row + 1, // adjusting for 1-based index in Excel
                reasons,
            };
        });

        // should be formatted in a more user-friendly way
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(report);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Report');

        const reportFilePath = `${process.cwd()}\\errorReports\\${randomUUID()}.xlsx`;
        XLSX.writeFile(workbook, reportFilePath, { bookType: 'xlsx' });

        return reportFilePath;
    }
}
