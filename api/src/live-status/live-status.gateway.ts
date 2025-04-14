/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Model, ObjectId } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Task, TaskDocument } from '../db/task/task.schema';
import { TaskStatus } from '../db/task/task.consts';

interface WatchedTask {
    documentKey: ObjectId;
    updateDescription: {
        updatedFields: {
            status?: TaskStatus;
        };
    };
}

@WebSocketGateway(80)
@Injectable()
export class LiveStatusGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private readonly logger = new Logger(LiveStatusGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

    onModuleInit() {
        this.taskModel.watch().on('change', async (doc: WatchedTask) => {
            const task = await this.taskModel.findById(doc.documentKey).exec();

            if (!task) {
                return;
            }

            const taskId = task.taskId;

            this.server.to(taskId).emit('taskStatus', { taskId, status: task.status });
        });
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe')
    async handleSubscribeToTask(client: Socket, taskId: string) {
        await client.join(taskId);
        this.logger.log(`Client ${client.id} subscribed to task ${taskId}`);
    }
}
