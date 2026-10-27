import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';


@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'An unexpected database error occurred';

        switch (exception.code) {
            case 'P2002':
                status = HttpStatus.CONFLICT;
                message = 'A record with this information already exists';
                break;

            case 'P2003':
                status = HttpStatus.CONFLICT;
                message = 'This operation violates a related record constraint';
                break;

            case 'P2025':
                status = HttpStatus.NOT_FOUND;
                message = 'The requested record was not found';
                break;
        }

        response.status(status).json({
            statusCode: status,
            message,
            error: exception.code,
        });
    }
}