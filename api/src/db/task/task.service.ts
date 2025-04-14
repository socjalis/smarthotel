import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './task.schema';
import { TASK_QUEUE_NAME, TaskStatus } from './task.consts';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskProcessorData } from './task.processor';
import { createReadStream } from 'fs';

@Injectable()
export class TaskService {
    constructor(
        @InjectModel(Task.name) private taskModel: Model<Task>,
        @InjectQueue(TASK_QUEUE_NAME) private taskQueue: Queue<TaskProcessorData>,
    ) {}

    async create(file: Express.Multer.File): Promise<string> {
        const task = await this.taskModel.create({
            filePath: file.path,
            status: TaskStatus.PENDING,
        });

        await this.taskQueue.add(task.taskId, {
            taskId: task.taskId,
            filePath: task.filePath,
        });

        return task.taskId;
    }

    async getStatus(taskId: string) {
        const task = await this.taskModel.findOne({ taskId }).exec();

        if (!task) {
            throw new BadRequestException(`Can't fetch status of nonexisting task`);
        }

        return task.status;
    }

    async getReportStream(taskId: string) {
        const task = await this.taskModel.findOne({ taskId }).exec();

        if (!task) {
            throw new BadRequestException(`Can't fetch error report of nonexisting task`);
        }

        if (!task.errorReportPath) {
            throw new BadRequestException(`Task ${taskId} has no error report`);
        }

        return createReadStream(task.errorReportPath);
    }
}
