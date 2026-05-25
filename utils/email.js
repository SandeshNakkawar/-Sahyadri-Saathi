const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path');

class Email {
  constructor(user, url, data = {}) {
    this.to = user.email;
    this.firstName = user.name ? user.name.split(' ')[0] : 'Traveler';
    this.url = url;
    this.data = data;
    this.from = `Sahyadri Saathi <${process.env.EMAIL_FROM || 'hello@sahyadrisaathi.com'}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Production: SendGrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Development: Mailtrap or configured SMTP
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    // 1) Render HTML from a Pug template
    const templatePath = path.join(
      __dirname,
      '..',
      'views',
      'email',
      `${template}.pug`
    );
    const html = pug.renderFile(templatePath, {
      firstName: this.firstName,
      url: this.url,
      subject,
      ...this.data
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      // Simple text fallback — strip HTML tags
      text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    };

    // 3) Create transport and send
    await this.newTransport().sendMail(mailOptions);
  }

  // ─── Convenience methods ─────────────────────────────────────

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Sahyadri Saathi! 🏔️');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 minutes)'
    );
  }

  async sendBookingConfirmation(bookingData) {
    this.data = { ...this.data, ...bookingData };
    await this.send(
      'bookingConfirmation',
      `Booking Confirmed — ${bookingData.guideName || bookingData.tourName} 🎫`
    );
  }

  async sendBookingAccepted(bookingData) {
    this.data = { ...this.data, ...bookingData };
    await this.send(
      'bookingAccepted',
      `Your booking request has been accepted! 🎉`
    );
  }

  async sendGuideApproved() {
    await this.send(
      'guideApproved',
      'Congratulations! You are now a verified Sahyadri Saathi guide 🏔️'
    );
  }

  async sendGuideRejected(data) {
    this.data = { ...this.data, ...data };
    await this.send(
      'guideRejected',
      'Update on your guide verification application'
    );
  }

  async sendPayoutProcessed(payoutData) {
    this.data = { ...this.data, ...payoutData };
    await this.send(
      'payoutProcessed',
      `Payout of ₹${payoutData.amount} has been processed 💰`
    );
  }

  async sendGuideAssignment(assignmentData) {
    this.data = { ...this.data, ...assignmentData };
    await this.send(
      'guideAssignment',
      `Guide Assigned for ${assignmentData.tourName} 🧭`
    );
  }

  async sendTripReminder(reminderData) {
    this.data = { ...this.data, ...reminderData };
    await this.send(
      'tripReminder',
      `Your trip is coming up — ${reminderData.tourName}! ⏰`
    );
  }

  async sendCancellation(cancelData) {
    this.data = { ...this.data, ...cancelData };
    await this.send(
      'cancellation',
      `Booking Cancelled — ${cancelData.tourName}`
    );
  }

  async sendRefundConfirmation(refundData) {
    this.data = { ...this.data, ...refundData };
    await this.send(
      'refundConfirmation',
      `Refund Processed — ${refundData.tourName} 💰`
    );
  }

  async sendReviewRequest(reviewData) {
    this.data = { ...this.data, ...reviewData };
    await this.send(
      'reviewRequest',
      `How was your ${reviewData.tourName} experience? ⭐`
    );
  }
}

module.exports = Email;
