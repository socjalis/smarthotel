import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AuthModule } from './auth/auth.module';
import { LiveStatusModule } from './live-status/live-status.module';

@Module({
    imports: [
        DbModule,
        AuthModule,
        LiveStatusModule,
        BullModule.forRoot({
            connection: {
                host: 'localhost',
                port: 6379,
            },
        }),
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('/');
    }
}
