import { env } from '../config/env';
import { logger } from '../config/logger';

export interface SmsPayload {
  phone: string;
  message: string;
}

export async function sendSms(payload: SmsPayload): Promise<void> {
  if (!env.SMS_PROVIDER_API_KEY || !env.SMS_PROVIDER_URL) {
    logger.warn('SMS provider not configured — skipping send');
    return;
  }

  const response = await fetch(env.SMS_PROVIDER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SMS_PROVIDER_API_KEY}`,
      ...(env.SMS_PROVIDER_SECRET ? { 'X-Api-Secret': env.SMS_PROVIDER_SECRET } : {}),
    },
    body: JSON.stringify({
      to: payload.phone,
      text: payload.message,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, body }, 'SMS send failed');
    throw new Error(`SMS provider responded with ${response.status}: ${body}`);
  }

  logger.info({ phone: payload.phone }, 'SMS sent successfully');
}
