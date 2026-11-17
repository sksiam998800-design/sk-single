import { env, integrations } from '../config/env';
import { NotificationRecordModel } from '../modules/support/support.model';
import { isDatabaseReady } from '../database/connection';

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  template: string;
}): Promise<{ status: 'sent' | 'failed' | 'skipped_unconfigured'; id?: string; error?: string }> {
  if (!integrations.resend) {
    if (isDatabaseReady()) {
      await NotificationRecordModel.create({
        to: params.to,
        channel: 'email',
        template: params.template,
        subject: params.subject,
        status: 'skipped_unconfigured',
        error: 'RESEND_API_KEY is not configured.',
      }).catch(() => undefined);
    }
    return { status: 'skipped_unconfigured', error: 'RESEND_API_KEY is not configured.' };
  }

  let lastError = 'Unknown error';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });

      const data = (await response.json()) as { id?: string; message?: string };
      if (response.ok && data.id) {
        if (isDatabaseReady()) {
          await NotificationRecordModel.create({
            to: params.to,
            channel: 'email',
            template: params.template,
            subject: params.subject,
            status: 'sent',
            providerId: data.id,
          }).catch(() => undefined);
        }
        return { status: 'sent', id: data.id };
      }
      lastError = data.message || `Resend returned HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error calling Resend';
    }
  }

  if (isDatabaseReady()) {
    await NotificationRecordModel.create({
      to: params.to,
      channel: 'email',
      template: params.template,
      subject: params.subject,
      status: 'failed',
      error: lastError,
    }).catch(() => undefined);
  }
  return { status: 'failed', error: lastError };
}
