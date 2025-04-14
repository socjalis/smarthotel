import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

export interface JwtPayload {
    username: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UserService,
        private jwtService: JwtService,
    ) {}

    async signIn(username: string, pass: string): Promise<{ access_token: string }> {
        const user = await this.usersService.getUserByName(username);
        if (!user) {
            this.logger.error(`User not found: ${username}`);
            throw new UnauthorizedException();
        }

        const match = await bcrypt.compare(pass, user.password);

        if (!match) {
            this.logger.error(`Password mismatch for user: ${username}`);
            throw new UnauthorizedException();
        }
        const payload: JwtPayload = { username: user.name };

        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
}
