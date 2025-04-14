import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskController } from './task.controller';
import { TASK_QUEUE_NAME } from './task.consts';
import { TaskProcessor } from './task.processor';
import { Task, TaskSchema } from './task.schema';
import { TaskService } from './task.service';
import { Reservation, ReservationSchema } from '../reservation/reservation.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Task.name, schema: TaskSchema },
            { name: Reservation.name, schema: ReservationSchema },
        ]),
        BullModule.registerQueue({
            name: TASK_QUEUE_NAME,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        }),
    ],
    controllers: [TaskController],
    providers: [TaskService, TaskProcessor],
    exports: [TaskService],
})
export class TaskModule {}
