import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, SchemaType } from 'mongoose';
import { TaskStatus } from './task.consts';
import { randomUUID } from 'crypto';

export type TaskDocument = HydratedDocument<Task>;

@Schema({
    timestamps: {
        createdAt: true,
        updatedAt: false
    },
})
export class Task {
    @Prop({ type: mongoose.Schema.Types.UUID, unique: true, required: true, default: () => randomUUID() })
    taskId: string;

    @Prop({ required: true })
    filePath: string;

    @Prop({ type: String, enum: Object.values(TaskStatus), required: true })
    status: TaskStatus;

    @Prop()
    errorReportPath?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);