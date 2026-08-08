import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    success: true,
    message: 'API is healthy',
  });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
