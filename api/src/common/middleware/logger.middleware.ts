import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger(LoggerMiddleware.name);

    use(req: Request, _res: Response, next: NextFunction) {
        this.logger.log(`${req.method} ${req.url}`);
        next();
    }
}
