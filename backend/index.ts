import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './src/modules/auth/auth.routes';
import { HttpError } from './src/errors/httpError';
import challanRoutes from './src/modules/challans/challan.routes';
import customerRoutes from './src/modules/customers/customer.routes';
import productRoutes from './src/modules/products/product.routes';
import prisma from './src/lib/prisma';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    message: 'API is healthy',
  });
});

app.get('/api/test-db', async (_request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    response.json({
      success: true,
      message: 'Database query successful',
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);

app.use((_request, _response, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;

  if (statusCode >= 500) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack ?? 'No stack trace available');
    } else {
      console.error('Unexpected server error:', error);
    }
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  response.status(statusCode).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});