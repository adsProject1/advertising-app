/**
 * mock-data.js
 * Seed data + lookup constants for the PromoTrack prototype.
 * This is the single source of truth used to initialize localStorage
 * on first run. Both the Desktop Admin app and the Mobile Agent app
 * read/write the same persisted state, so actions in one surface are
 * reflected in the other.
 *
 * There is no agent/user roster: field officers are assigned to
 * activities offline and simply log into the mobile app with the
 * Activity Number + their mobile number. An Activity may optionally
 * carry a free-text "field officer name" noted by ops for reference,
 * but it is not a structured identity — submissions are attributed by
 * whatever mobile number was entered at login.
 */

const MOCK_DATA = {
  events: [
    {
      id: 'EVT-10001',
      name: 'Raksha Bandhan — Hero Bike Promotion',
      description: 'Nationwide mall activation to promote the new Hero Splendor+ bike ahead of Raksha Bandhan, featuring live display, branding and customer photo moments.',
      brand: 'Hero MotoCorp',
      product: 'Hero Splendor+',
      dateFrom: '2026-08-20',
      dateTo: '2026-08-25',
      elements: ['Product Display', 'Branding', 'Photoshoot', 'Customer Interaction'],
      status: 'Active'
    },
    {
      id: 'EVT-10002',
      name: 'Diwali Product Promotion',
      description: 'Festive season promotion for the LuminaHome LED Diya range across leading Mumbai malls.',
      brand: 'LuminaHome',
      product: 'LED Diya Light Range',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-10',
      elements: ['Product Display', 'Sampling', 'Lead Collection'],
      status: 'Scheduled'
    },
    {
      id: 'EVT-10003',
      name: 'Summer Cooler Campaign',
      description: 'In-mall demo campaign for the CoolBreeze Arctic Pro air cooler.',
      brand: 'CoolBreeze',
      product: 'Arctic Pro Air Cooler',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-10',
      elements: ['Product Display', 'Photoshoot', 'Demo'],
      status: 'Completed'
    },
    {
      id: 'EVT-10004',
      name: 'New Year Smartphone Launch',
      description: 'Launch activation for the Zenfone Nova X across Delhi NCR malls.',
      brand: 'Zenfone',
      product: 'Zenfone Nova X',
      dateFrom: '2026-12-28',
      dateTo: '2027-01-05',
      elements: ['Product Display', 'Branding', 'Demo'],
      status: 'Draft'
    },
    {
      id: 'EVT-10005',
      name: 'Monsoon Footwear Drive',
      description: 'Rain-season promotion for the StepRight WaterGuard sneaker line.',
      brand: 'StepRight',
      product: 'WaterGuard Sneakers',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-20',
      elements: ['Product Display', 'Sampling'],
      status: 'Completed'
    },
    {
      id: 'EVT-10006',
      name: 'Independence Day Mega Sale',
      description: 'Store-wide sale activation originally planned for MegaMart outlets; cancelled due to vendor delay.',
      brand: 'MegaMart',
      product: 'Store-wide Sale',
      dateFrom: '2026-08-13',
      dateTo: '2026-08-18',
      elements: ['Branding'],
      status: 'Cancelled'
    }
  ],

  activities: [
    {
      id: 'ACT-10001',
      eventId: 'EVT-10001',
      name: 'Phoenix Mall Pune',
      description: 'Primary display activation at the main atrium of Phoenix Marketcity.',
      type: 'Mall Promotion',
      location: { name: 'Phoenix Marketcity', addressLine1: 'Viman Nagar', addressLine2: '', city: 'Pune', pin: '411014' },
      elements: ['Branding', 'Product Display', 'Photoshoot', 'Customer Interaction'],
      fieldOfficerName: 'Raj Kumar',
      status: 'Active'
    },
    {
      id: 'ACT-10002',
      eventId: 'EVT-10001',
      name: 'Amanora Mall Pune',
      description: 'Secondary display activation at Amanora Park Town.',
      type: 'Mall Promotion',
      location: { name: 'Amanora Mall', addressLine1: 'Amanora Park Town', addressLine2: 'Hadapsar', city: 'Pune', pin: '411028' },
      elements: ['Branding', 'Product Display', 'Photoshoot'],
      fieldOfficerName: 'Amit Sharma',
      status: 'Active'
    },
    {
      id: 'ACT-10003',
      eventId: 'EVT-10001',
      name: 'Seasons Mall Pune',
      description: 'Weekend brand activation with a promotional photo booth.',
      type: 'Brand Activation',
      location: { name: 'Seasons Mall', addressLine1: 'Magarpatta Road', addressLine2: '', city: 'Pune', pin: '411013' },
      elements: ['Branding', 'Photoshoot'],
      fieldOfficerName: 'Pooja Deshmukh',
      status: 'Scheduled'
    },
    {
      id: 'ACT-10004',
      eventId: 'EVT-10002',
      name: 'Inorbit Mall Mumbai',
      description: 'Diwali sampling roadshow booth.',
      type: 'Roadshow',
      location: { name: 'Inorbit Mall', addressLine1: 'Malad West', addressLine2: '', city: 'Mumbai', pin: '400064' },
      elements: ['Product Display', 'Sampling', 'Lead Generation'],
      fieldOfficerName: '',
      status: 'Scheduled'
    },
    {
      id: 'ACT-10005',
      eventId: 'EVT-10003',
      name: 'Forum Mall Bengaluru',
      description: 'Cooler demo activation, concluded.',
      type: 'Product Demo',
      location: { name: 'Forum Mall', addressLine1: 'Koramangala', addressLine2: '', city: 'Bengaluru', pin: '560095' },
      elements: ['Product Display', 'Photoshoot', 'Product Demonstration'],
      fieldOfficerName: 'Raj Kumar',
      status: 'Completed'
    },
    {
      id: 'ACT-10006',
      eventId: 'EVT-10004',
      name: 'Select Citywalk Delhi',
      description: 'Launch-day activation, pending final approval.',
      type: 'Brand Activation',
      location: { name: 'Select Citywalk', addressLine1: 'Saket', addressLine2: '', city: 'New Delhi', pin: '110017' },
      elements: ['Branding', 'Product Display'],
      fieldOfficerName: '',
      status: 'Draft'
    }
  ],

  tasks: [
    {
      id: 'TSK-10001', activityId: 'ACT-10001', name: 'Morning Photoshoot',
      description: 'Capture the bike display with the morning crowd.',
      type: 'Photo Capture', scheduledTime: '10:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10002', activityId: 'ACT-10001', name: 'Afternoon Photoshoot',
      description: 'Capture the bike display with the afternoon crowd.',
      type: 'Photo Capture', scheduledTime: '2:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10003', activityId: 'ACT-10001', name: 'Evening Photoshoot',
      description: 'Capture the bike display with the evening crowd.',
      type: 'Photo Capture', scheduledTime: '6:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10004', activityId: 'ACT-10001', name: 'Customer Interaction Log',
      description: 'Log a short interaction with an interested customer.',
      type: 'Customer Interaction', scheduledTime: '12:00 PM', executionType: 'Once',
      requirements: { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true }
    },
    {
      id: 'TSK-10005', activityId: 'ACT-10001', name: 'Lead Collection Form',
      description: 'Collect contact details from an interested walk-in.',
      type: 'Lead Collection', scheduledTime: '4:00 PM', executionType: 'Once',
      requirements: { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true }
    },
    {
      id: 'TSK-10006', activityId: 'ACT-10002', name: 'Morning Photoshoot',
      description: 'Capture the bike display with the morning crowd.',
      type: 'Photo Capture', scheduledTime: '10:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10007', activityId: 'ACT-10002', name: 'Afternoon Photoshoot',
      description: 'Capture the bike display with the afternoon crowd.',
      type: 'Photo Capture', scheduledTime: '2:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10008', activityId: 'ACT-10002', name: 'Evening Photoshoot',
      description: 'Capture the bike display with the evening crowd.',
      type: 'Photo Capture', scheduledTime: '6:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10009', activityId: 'ACT-10003', name: 'Branding Setup Checklist',
      description: 'Confirm branding elements are installed correctly.',
      type: 'Checklist', scheduledTime: '9:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: true, customerDetails: false }
    },
    {
      id: 'TSK-10010', activityId: 'ACT-10003', name: 'Product Demo Photos',
      description: 'Capture the photo booth setup in action.',
      type: 'Photo Capture', scheduledTime: '11:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    },
    {
      id: 'TSK-10011', activityId: 'ACT-10005', name: 'Demo Session Photos',
      description: 'Capture the cooler demo session.',
      type: 'Photo Capture', scheduledTime: '11:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false }
    }
  ],

  submissions: [
    {
      id: 'SUB-10001', taskId: 'TSK-10001', activityId: 'ACT-10001', mobile: '9876543210',
      submittedAt: '2026-08-20T10:12:43', deviceTimestamp: '10:12:43 AM', serverTimestamp: '10:12:49 AM',
      lat: 18.5612, lng: 73.9178, location: 'Phoenix Marketcity, Pune', accuracy: 12,
      comment: 'Hero bike display placed near main entrance.', status: 'Approved'
    },
    {
      id: 'SUB-10002', taskId: 'TSK-10006', activityId: 'ACT-10002', mobile: '9876543214',
      submittedAt: '2026-08-20T10:15:00', deviceTimestamp: '10:15:00 AM', serverTimestamp: '10:15:06 AM',
      lat: 18.5158, lng: 73.9376, location: 'Amanora Mall, Pune', accuracy: 22,
      comment: 'Quick shot near the entrance.', status: 'Rejected',
      rejectionReason: 'Photo is blurred and bike branding is not visible. Please resubmit a clearer photo.'
    },
    {
      id: 'SUB-10003', taskId: 'TSK-10011', activityId: 'ACT-10005', mobile: '9876543210',
      submittedAt: '2026-08-05T11:30:00', deviceTimestamp: '11:30:00 AM', serverTimestamp: '11:30:03 AM',
      lat: 12.9345, lng: 77.6101, location: 'Forum Mall, Bengaluru', accuracy: 8,
      comment: 'Demo session drew a good crowd.', status: 'Approved'
    }
  ],

  nextIds: { event: 10007, activity: 10007, task: 10012, submission: 10004 }
};

// Lookup constants used to populate dropdowns and legends across both apps.
const EVENT_STATUSES = ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'];
const ACTIVITY_STATUSES = ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'];
const TASK_STATUSES = ['Pending', 'Rejected', 'Completed'];
const SUBMISSION_STATUSES = ['Submitted', 'Pending Review', 'Approved', 'Rejected'];

const EVENT_ELEMENTS = ['Product Display', 'Branding', 'Photoshoot', 'Customer Interaction', 'Lead Collection', 'Sampling', 'Demo', 'Other'];
const ACTIVITY_TYPES = ['Mall Promotion', 'Roadshow', 'Product Demo', 'Brand Activation', 'Photoshoot', 'Sampling', 'Customer Engagement', 'Other'];
const ACTIVITY_ELEMENTS = ['Branding', 'Product Display', 'Photoshoot', 'Customer Interaction', 'Lead Generation', 'Product Demonstration', 'Sampling'];
const TASK_TYPES = ['Photo Capture', 'Video Capture', 'Form Submission', 'Customer Interaction', 'Product Demo', 'Lead Collection', 'Checklist', 'Other'];
const EXECUTION_TYPES = ['Once', 'Multiple Times Per Day', 'Daily', 'Custom'];
