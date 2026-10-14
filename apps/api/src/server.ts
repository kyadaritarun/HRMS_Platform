import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`[Uptrix API Server] Running on http://localhost:${PORT}`);
});
