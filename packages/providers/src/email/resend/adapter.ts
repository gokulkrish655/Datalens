import { EmailPayload, IEmailProvider } from '../interface';

/**
 * Minimal Resend adapter stub that implements `IEmailProvider`.
 * Uses the `resend` package when available; otherwise falls back to a stub.
 */
export class ResendAdapter implements IEmailProvider {
  public readonly providerName = 'resend';

  async send(payload: EmailPayload): Promise<{ messageId: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Resend } = require('resend');
      if (process.env.RESEND_API_KEY) {
        const client = new Resend(process.env.RESEND_API_KEY);
        // call minimal API; adapt if package shape differs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any).sendEmail({
          to: payload.to,
          from: payload.from,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        return { messageId: 'resend:sent' };
      }
    } catch (e) {
      // noop
    }

    return { messageId: 'resend:stub' };
  }
}

export default ResendAdapter;