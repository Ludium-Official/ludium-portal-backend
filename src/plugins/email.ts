import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

declare module 'fastify' {
  interface FastifyInstance {
    emailService: EmailService;
  }
}

export class EmailService {
  private transporter;

  constructor(config: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async sendVerificationEmail(to: string, verificationCode: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ludium.io',
      to,
      subject: 'Ludium Portal - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Please enter the verification code below to complete your email verification.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>For security reasons, please do not share this code with anyone.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

async function emailPlugin(fastify: FastifyInstance) {
  const emailService = new EmailService({
    host: fastify.config.EMAIL_HOST || 'smtp.gmail.com',
    port: Number.parseInt(fastify.config.EMAIL_PORT || '587'),
    secure: fastify.config.EMAIL_SECURE === 'true',
    auth: {
      user: fastify.config.EMAIL_USER || '',
      pass: fastify.config.EMAIL_PASS || '',
    },
  });

  fastify.decorate('emailService', emailService);
}

export default fp(emailPlugin);
