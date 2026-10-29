import { Request } from 'express';
import { UserRole } from '../../../generated/prisma/enums.js';

export interface AuthenticatedRequest extends Request {
    user: {
        sub: number;
        role: UserRole;
        restaurantId: number | null;
    };
}