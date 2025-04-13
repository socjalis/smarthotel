import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { Task, TaskSchema } from './task.schema';
import { BullModule } from '@nestjs/bullmq';
import { TaskProcessor } from './task.processor';
import { Reservation, ReservationSchema } from '../reservation/reservation.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Task.name, schema: TaskSchema },
            { name: Reservation.name, schema: ReservationSchema },
        ]),
        BullModule.registerQueue({
            name: 'task',
            defaultJobOptions: {
                attempts: 2,
            }
        }),
    ],
    controllers: [TaskController],
    providers: [TaskService, TaskProcessor],
    exports: [TaskService],
})
export class TaskModule {}