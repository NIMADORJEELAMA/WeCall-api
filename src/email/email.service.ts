import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendLoginOtp(email: string, otp: string) {
    const { error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: [email],
      subject: 'Your WeCall verification code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
          <h2 style="color: #172238;">WeCall Login Verification</h2>

          <p>Use the following code to complete your login:</p>

          <div
            style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              background: #f0f5fb;
              padding: 20px;
              text-align: center;
              border-radius: 12px;
              margin: 24px 0;
            "
          >
            ${otp}
          </div>

          <p>This code expires in <strong>10 minutes</strong>.</p>

          <p style="color: #777;">
            If you did not attempt to log in to WeCall, you can safely ignore
            this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send OTP email:', error);
      throw new InternalServerErrorException(
        'Unable to send verification email',
      );
    }
  }
}
