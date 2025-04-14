import { Module } from '@nestjs/common';
import { LiveStatusGateway } from './live-status.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../db/task/task.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
    providers: [LiveStatusGateway],
})
export class LiveStatusModule {}
