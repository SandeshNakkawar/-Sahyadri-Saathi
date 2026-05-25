// Quick verification script - tests that all modules load correctly
require('dotenv').config();

console.log('=== YatraKaro Production Verification ===\n');

// 1. Test Email class
const Email = require('../utils/email');
const e = new Email({ name: 'Test', email: 'test@test.com' }, 'http://test.com');
console.log('✅ Email class instantiated');
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(e)).filter(m => m !== 'constructor');
console.log('   Methods:', methods.join(', '));

// 2. Test email template compilation
const pug = require('pug');
const path = require('path');
const projectRoot = path.join(__dirname, '..');
const templates = [
  'welcome', 'passwordReset', 'bookingConfirmation', 'guideAssignment',
  'tripReminder', 'cancellation', 'refundConfirmation', 'reviewRequest'
];

console.log('\n--- Email Templates ---');
templates.forEach(t => {
  try {
    pug.compileFile(path.join(projectRoot, 'views', 'email', t + '.pug'));
    console.log('  ✅ ' + t + '.pug compiles');
  } catch (err) {
    console.error('  ❌ ' + t + '.pug FAILED:', err.message);
  }
});

// 3. Test Pug view templates
console.log('\n--- View Templates ---');
const views = [
  'base', 'tour', 'my-bookings', 'booking-detail',
  'admin/admin-dashboard', 'admin/admin-bookings', 'admin/admin-booking-detail',
  'guide/guide-trips', 'guide/guide-trip-detail'
];
views.forEach(v => {
  try {
    pug.compileFile(path.join(projectRoot, 'views', v + '.pug'));
    console.log('  ✅ ' + v + '.pug compiles');
  } catch (err) {
    console.error('  ❌ ' + v + '.pug FAILED:', err.message);
  }
});

// 4. Test scheduled tasks module
console.log('\n--- Scheduled Tasks ---');
const { startScheduledTasks, stopScheduledTasks } = require('../utils/scheduledTasks');
console.log('  ✅ scheduledTasks module loaded');

// 5. Summary
console.log('\n=== Verification Complete ===');
