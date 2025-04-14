import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskModule } from './task/task.module';

@Module({
    imports: [
        MongooseModule.forRoot('mongodb://localhost:27017', {
            replicaSet: 'rs0',
            dbName: 'smarthotel',
        }),
        TaskModule,
    ],
})
export class DbModule {}
