const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideBooking',
      required: [true, 'A payout request must reference a booking']
    },
    guideProfile: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideProfile',
      required: [true, 'A payout request must reference a guide profile']
    },
    amount: {
      type: Number,
      required: [true, 'A payout request must have an amount']
    },
    platformCommissionAmount: {
      type: Number,
      required: [true, 'A payout request must record the platform commission']
    },
    payoutMethod: {
      type: String,
      enum: ['upi'],
      default: 'upi'
    },
    // Temporary UPI — collected at payout request time, cleared after admin marks paid
    temporaryUpiId: {
      type: String,
      trim: true
    },
    // Masked UPI — kept for records after payout is completed
    upiMasked: {
      type: String,
      trim: true
    },
    upiAccountName: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['requested', 'paid', 'rejected', 'on_hold'],
      default: 'requested'
    },
    adminTransactionRef: {
      type: String,
      trim: true
    },
    adminNote: {
      type: String,
      trim: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    paidAt: {
      type: Date
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
payoutRequestSchema.index({ booking: 1 });
payoutRequestSchema.index({ guideProfile: 1 });
payoutRequestSchema.index({ status: 1 });

// Populate on find
payoutRequestSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'booking',
    select: 'tourist place startDate endDate totalPrice guidePayoutAmount status'
  }).populate({
    path: 'guideProfile',
    select: 'displayName user'
  });
  next();
});

// Helper: mask UPI ID (e.g., "rajesh@okicici" → "raj***@ok***")
function maskUpiId(upiId) {
  if (!upiId) return '';
  const parts = upiId.split('@');
  if (parts.length !== 2) return '***';
  const handle = parts[0].length > 3
    ? parts[0].substring(0, 3) + '***'
    : parts[0][0] + '***';
  const provider = parts[1].length > 2
    ? parts[1].substring(0, 2) + '***'
    : parts[1][0] + '***';
  return `${handle}@${provider}`;
}

// Static method: process payout completion
payoutRequestSchema.statics.markAsPaid = async function(
  payoutId,
  transactionRef,
  adminNote
) {
  const payout = await this.findById(payoutId);
  if (!payout) throw new Error('Payout request not found');
  if (payout.status === 'paid') throw new Error('Already paid');

  // Mask UPI before clearing
  payout.upiMasked = maskUpiId(payout.temporaryUpiId);
  payout.temporaryUpiId = undefined;
  payout.status = 'paid';
  payout.adminTransactionRef = transactionRef;
  payout.adminNote = adminNote;
  payout.paidAt = new Date();
  await payout.save();

  // Update booking payout status
  const GuideBooking = mongoose.model('GuideBooking');
  await GuideBooking.findByIdAndUpdate(payout.booking._id || payout.booking, {
    payoutStatus: 'paid'
  });

  // Update guide total earnings
  const GuideProfile = mongoose.model('GuideProfile');
  await GuideProfile.findByIdAndUpdate(
    payout.guideProfile._id || payout.guideProfile,
    { $inc: { totalEarnings: payout.amount } }
  );

  return payout;
};

const PayoutRequest = mongoose.model('PayoutRequest', payoutRequestSchema);

module.exports = PayoutRequest;
