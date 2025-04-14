import {
    Controller,
    FileTypeValidator,
    Get,
    Header,
    Param,
    ParseFilePipe,
    ParseUUIDPipe,
    Post,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskService } from './task.service';
import { AuthGuard } from '../../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [new FileTypeValidator({ fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })],
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.taskService.create(file);
    }

    @Get('status/:taskId')
    async getStatus(@Param('taskId', ParseUUIDPipe) taskId: string) {
        return this.taskService.getStatus(taskId);
    }

    @Get('report/:taskId')
    @Header('Content-Disposition', () => `attachment; filename="error-report-${new Date().toISOString()}.xlsx"`)
    async getReport(@Param('taskId', ParseUUIDPipe) taskId: string) {
        const fileStream = await this.taskService.getReportStream(taskId);

        return new StreamableFile(fileStream);
    }
}
