import { EmailPayload, IEmailProvider } from '../interface';

/**
 * Minimal SendGrid adapter stub that implements `IEmailProvider`.
 * It intentionally avoids requiring `@sendgrid/mail` at build-time so
 * the repository remains type-checkable even if the dependency is missing.
 */
export class SendGridAdapter implements IEmailProvider {
	public readonly providerName = 'sendgrid';

	async send(payload: EmailPayload): Promise<{ messageId: string }> {
		// Best-effort: attempt to use @sendgrid/mail if available, otherwise noop
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const sg = require('@sendgrid/mail');
			if (process.env.SENDGRID_API_KEY) {
				sg.setApiKey(process.env.SENDGRID_API_KEY);
				const msg = {
					to: payload.to,
					from: payload.from,
					subject: payload.subject,
					html: payload.html,
					text: payload.text,
				};
				// send returns a promise; ignore returned response details
				await sg.send(msg as any);
				return { messageId: 'sendgrid:sent' };
			}
		} catch (e) {
			// fall through to stub behavior
		}

		// Fallback stub for CI/typecheck environments
		return { messageId: 'sendgrid:stub' };
	}
}

export default SendGridAdapter;