import 'dotenv/config';
import app from './app.js';
import { checkAndSendExpiryAlerts } from './services/subscriptionBilling.js';
import { runAutomatedEventEmails } from './services/eventEmailService.js';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`[Uptrix API Server] Running on http://localhost:${PORT}`);

  // Schedule automated 10-day subscription expiry alerts daily (every 24 hours)
  setTimeout(() => {
    checkAndSendExpiryAlerts().catch((err) => console.error('[Expiry Alerts Error]', err.message));
  }, 15000);

  setInterval(() => {
    checkAndSendExpiryAlerts().catch((err) => console.error('[Expiry Alerts Error]', err.message));
  }, 24 * 60 * 60 * 1000);

  // Schedule automated employee birthday and upcoming holiday announcement emails daily
  setTimeout(() => {
    runAutomatedEventEmails().catch((err) => console.error('[Event Emails Error]', err.message));
  }, 25000);

  setInterval(() => {
    runAutomatedEventEmails().catch((err) => console.error('[Event Emails Error]', err.message));
  }, 24 * 60 * 60 * 1000);
});
