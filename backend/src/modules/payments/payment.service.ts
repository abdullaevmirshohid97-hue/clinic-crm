import crypto from 'crypto';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';

const PROVIDERS = ['click', 'payme', 'kaspi', 'halyk', 'mbank', 'omoney', 'elsom', 'paypal', 'alipay'] as const;
type ProviderName = (typeof PROVIDERS)[number];

type ProviderPayload = {
  provider: string;
  enabled: boolean;
  merchantId: string;
  secretKey?: string;
  webhookSecret?: string;
};

function getEncryptionKey() {
  const raw = env.PAYMENT_CONFIG_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptValue(plain: string) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function maskConfigured(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

export class PaymentService {
  static async verifyPin(clinicId: string, pin: string) {
    const pinHash = crypto.createHash('sha256').update((pin || '').trim()).digest('hex');
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('clinic_id', clinicId)
      .eq('key', 'paymentIntegrationPinHash')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    const savedHash = data?.value || '';
    if (!savedHash) return true;
    return savedHash === pinHash;
  }

  static async setPin(clinicId: string, pin: string) {
    const pinHash = pin.trim()
      ? crypto.createHash('sha256').update(pin.trim()).digest('hex')
      : '';
    const { error } = await supabase
      .from('settings')
      .upsert({ clinic_id: clinicId, key: 'paymentIntegrationPinHash', value: pinHash }, { onConflict: 'clinic_id,key' });
    if (error) throw error;
  }

  static async getProviders(clinicId: string) {
    const { data, error } = await supabase
      .from('payment_provider_accounts')
      .select('provider, is_enabled, merchant_account_id, secret_key, webhook_secret, mode')
      .eq('clinic_id', clinicId);
    if (error) throw error;

    const map = new Map((data || []).map((row: any) => [row.provider, row]));
    return PROVIDERS.map((provider) => {
      const row: any = map.get(provider);
      return {
        provider,
        enabled: Boolean(row?.is_enabled),
        merchantId: row?.merchant_account_id || '',
        hasSecretKey: maskConfigured(row?.secret_key),
        hasWebhookSecret: maskConfigured(row?.webhook_secret),
        mode: row?.mode || 'production',
      };
    });
  }

  static async saveProviders(clinicId: string, providers: ProviderPayload[]) {
    for (const payload of providers) {
      if (!PROVIDERS.includes(payload.provider as ProviderName)) continue;
      const provider = payload.provider as ProviderName;

      const { data: existing, error: existingError } = await supabase
        .from('payment_provider_accounts')
        .select('id, secret_key, webhook_secret')
        .eq('clinic_id', clinicId)
        .eq('provider', provider)
        .maybeSingle();
      if (existingError) throw existingError;

      const secretKey = payload.secretKey
        ? encryptValue(payload.secretKey)
        : existing?.secret_key || '';
      const webhookSecret = payload.webhookSecret
        ? encryptValue(payload.webhookSecret)
        : existing?.webhook_secret || '';

      const { error } = await supabase
        .from('payment_provider_accounts')
        .upsert(
          {
            clinic_id: clinicId,
            provider,
            is_enabled: Boolean(payload.enabled),
            merchant_account_id: payload.merchantId || null,
            secret_key: secretKey || null,
            webhook_secret: webhookSecret || null,
            mode: 'production',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clinic_id,provider' }
        );
      if (error) throw error;
    }
  }
}
