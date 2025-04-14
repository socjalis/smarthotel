import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { SECRET_KEY } from './auth.consts';
import { AuthController } from './auth.controller';

@Module({
    imports: [
        UserModule,
        JwtModule.register({
            global: true,
            secret: SECRET_KEY,
            signOptions: { expiresIn: '600s' },
        }),
    ],
    providers: [AuthService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
