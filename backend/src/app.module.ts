import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DbModule,
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
  providers: [AppService],
})
export class AppModule {}
