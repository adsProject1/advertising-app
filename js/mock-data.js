/**
 * mock-data.js
 * Seed data + lookup constants for the PromoTrack prototype.
 * This is the single source of truth used to initialize localStorage
 * on first run. Both the Desktop Admin app and the Mobile Agent app
 * read/write the same persisted state, so actions in one surface are
 * reflected in the other.
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
      city: 'Pune',
      state: 'Maharashtra',
      targetAudience: 'Young professionals & families, 18-40 yrs',
      expectedFootfall: 12000,
      instructions: 'Ensure the bike is positioned near the main entrance with branding visible at all times.',
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
      city: 'Mumbai',
      state: 'Maharashtra',
      targetAudience: 'Households, 25-55 yrs',
      expectedFootfall: 9000,
      instructions: 'Sampling counter must remain stocked; log every lead captured.',
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
      city: 'Bengaluru',
      state: 'Karnataka',
      targetAudience: 'Homeowners, 25-50 yrs',
      expectedFootfall: 6000,
      instructions: 'Run cooler demo every 2 hours; capture before/after crowd photos.',
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
      city: 'Delhi',
      state: 'Delhi',
      targetAudience: 'Tech enthusiasts, 18-35 yrs',
      expectedFootfall: 15000,
      instructions: 'Locations pending confirmation. Do not publish until finalized.',
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
      city: 'Chennai',
      state: 'Tamil Nadu',
      targetAudience: 'Students & young professionals',
      expectedFootfall: 7000,
      instructions: 'Collect footfall count at end of each shift.',
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
      city: 'Hyderabad',
      state: 'Telangana',
      targetAudience: 'General shoppers',
      expectedFootfall: 20000,
      instructions: '',
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
      location: { name: 'Phoenix Marketcity', address: 'Viman Nagar', city: 'Pune', state: 'Maharashtra', pin: '411014', lat: 18.5612, lng: 73.9178 },
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      startTime: '10:00',
      endTime: '20:00',
      elements: ['Branding', 'Product Display', 'Photoshoot', 'Customer Interaction'],
      agentIds: ['AGT-1001', 'AGT-1002', 'AGT-1003'],
      status: 'Active'
    },
    {
      id: 'ACT-10002',
      eventId: 'EVT-10001',
      name: 'Amanora Mall Pune',
      description: 'Secondary display activation at Amanora Park Town.',
      type: 'Mall Promotion',
      location: { name: 'Amanora Mall', address: 'Amanora Park Town, Hadapsar', city: 'Pune', state: 'Maharashtra', pin: '411028', lat: 18.5158, lng: 73.9376 },
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      startTime: '10:00',
      endTime: '20:00',
      elements: ['Branding', 'Product Display', 'Photoshoot'],
      agentIds: ['AGT-1004', 'AGT-1005'],
      status: 'Active'
    },
    {
      id: 'ACT-10003',
      eventId: 'EVT-10001',
      name: 'Seasons Mall Pune',
      description: 'Weekend brand activation with a promotional photo booth.',
      type: 'Brand Activation',
      location: { name: 'Seasons Mall', address: 'Magarpatta Road', city: 'Pune', state: 'Maharashtra', pin: '411013', lat: 18.5679, lng: 73.9143 },
      startDate: '2026-08-23',
      endDate: '2026-08-25',
      startTime: '11:00',
      endTime: '19:00',
      elements: ['Branding', 'Photoshoot'],
      agentIds: ['AGT-1006'],
      status: 'Scheduled'
    },
    {
      id: 'ACT-10004',
      eventId: 'EVT-10002',
      name: 'Inorbit Mall Mumbai',
      description: 'Diwali sampling roadshow booth.',
      type: 'Roadshow',
      location: { name: 'Inorbit Mall', address: 'Malad West', city: 'Mumbai', state: 'Maharashtra', pin: '400064', lat: 19.1197, lng: 72.9050 },
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      startTime: '11:00',
      endTime: '21:00',
      elements: ['Product Display', 'Sampling', 'Lead Generation'],
      agentIds: ['AGT-1002', 'AGT-1003'],
      status: 'Scheduled'
    },
    {
      id: 'ACT-10005',
      eventId: 'EVT-10003',
      name: 'Forum Mall Bengaluru',
      description: 'Cooler demo activation, concluded.',
      type: 'Product Demo',
      location: { name: 'Forum Mall', address: 'Koramangala', city: 'Bengaluru', state: 'Karnataka', pin: '560095', lat: 12.9345, lng: 77.6101 },
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      startTime: '10:00',
      endTime: '20:00',
      elements: ['Product Display', 'Photoshoot', 'Product Demonstration'],
      agentIds: ['AGT-1001'],
      status: 'Completed'
    },
    {
      id: 'ACT-10006',
      eventId: 'EVT-10004',
      name: 'Select Citywalk Delhi',
      description: 'Launch-day activation, pending final approval.',
      type: 'Brand Activation',
      location: { name: 'Select Citywalk', address: 'Saket', city: 'New Delhi', state: 'Delhi', pin: '110017', lat: 28.5285, lng: 77.2201 },
      startDate: '2026-12-28',
      endDate: '2026-12-30',
      startTime: '10:00',
      endTime: '20:00',
      elements: ['Branding', 'Product Display'],
      agentIds: [],
      status: 'Draft'
    }
  ],

  tasks: [
    {
      id: 'TSK-10001', activityId: 'ACT-10001', name: 'Morning Photoshoot',
      description: 'Capture the bike display with the morning crowd.',
      type: 'Photo Capture', scheduledTime: '10:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1001', 'AGT-1002', 'AGT-1003']
    },
    {
      id: 'TSK-10002', activityId: 'ACT-10001', name: 'Afternoon Photoshoot',
      description: 'Capture the bike display with the afternoon crowd.',
      type: 'Photo Capture', scheduledTime: '2:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1001', 'AGT-1002', 'AGT-1003']
    },
    {
      id: 'TSK-10003', activityId: 'ACT-10001', name: 'Evening Photoshoot',
      description: 'Capture the bike display with the evening crowd.',
      type: 'Photo Capture', scheduledTime: '6:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1001', 'AGT-1002', 'AGT-1003']
    },
    {
      id: 'TSK-10004', activityId: 'ACT-10001', name: 'Customer Interaction Log',
      description: 'Log a short interaction with an interested customer.',
      type: 'Customer Interaction', scheduledTime: '12:00 PM', executionType: 'Once',
      requirements: { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true },
      agentIds: ['AGT-1001', 'AGT-1002']
    },
    {
      id: 'TSK-10005', activityId: 'ACT-10001', name: 'Lead Collection Form',
      description: 'Collect contact details from an interested walk-in.',
      type: 'Lead Collection', scheduledTime: '4:00 PM', executionType: 'Once',
      requirements: { photo: false, gps: true, timestamp: true, comment: true, customerDetails: true },
      agentIds: ['AGT-1002', 'AGT-1003']
    },
    {
      id: 'TSK-10006', activityId: 'ACT-10002', name: 'Morning Photoshoot',
      description: 'Capture the bike display with the morning crowd.',
      type: 'Photo Capture', scheduledTime: '10:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1004', 'AGT-1005']
    },
    {
      id: 'TSK-10007', activityId: 'ACT-10002', name: 'Afternoon Photoshoot',
      description: 'Capture the bike display with the afternoon crowd.',
      type: 'Photo Capture', scheduledTime: '2:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1004', 'AGT-1005']
    },
    {
      id: 'TSK-10008', activityId: 'ACT-10002', name: 'Evening Photoshoot',
      description: 'Capture the bike display with the evening crowd.',
      type: 'Photo Capture', scheduledTime: '6:00 PM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1004', 'AGT-1005']
    },
    {
      id: 'TSK-10009', activityId: 'ACT-10003', name: 'Branding Setup Checklist',
      description: 'Confirm branding elements are installed correctly.',
      type: 'Checklist', scheduledTime: '9:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: true, customerDetails: false },
      agentIds: ['AGT-1006']
    },
    {
      id: 'TSK-10010', activityId: 'ACT-10003', name: 'Product Demo Photos',
      description: 'Capture the photo booth setup in action.',
      type: 'Photo Capture', scheduledTime: '11:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1006']
    },
    {
      id: 'TSK-10011', activityId: 'ACT-10005', name: 'Demo Session Photos',
      description: 'Capture the cooler demo session.',
      type: 'Photo Capture', scheduledTime: '11:00 AM', executionType: 'Once',
      requirements: { photo: true, gps: true, timestamp: true, comment: false, customerDetails: false },
      agentIds: ['AGT-1001']
    }
  ],

  agents: [
    { id: 'AGT-1001', name: 'Raj Kumar', mobile: '9876543210', status: 'Active' },
    { id: 'AGT-1002', name: 'Neha Singh', mobile: '9876543212', status: 'Active' },
    { id: 'AGT-1003', name: 'Priya Verma', mobile: '9876543213', status: 'Active' },
    { id: 'AGT-1004', name: 'Amit Sharma', mobile: '9876543214', status: 'Active' },
    { id: 'AGT-1005', name: 'Sanjay Patil', mobile: '9876543215', status: 'Active' },
    { id: 'AGT-1006', name: 'Pooja Deshmukh', mobile: '9876543216', status: 'Active' }
  ],

  submissions: [
    {
      id: 'SUB-10001', taskId: 'TSK-10001', activityId: 'ACT-10001', agentId: 'AGT-1001',
      submittedAt: '2026-08-20T10:12:43', deviceTimestamp: '10:12:43 AM', serverTimestamp: '10:12:49 AM',
      lat: 18.5612, lng: 73.9178, location: 'Phoenix Mall Pune', accuracy: 12,
      comment: 'Hero bike display placed near main entrance.', status: 'Approved'
    },
    {
      id: 'SUB-10002', taskId: 'TSK-10001', activityId: 'ACT-10001', agentId: 'AGT-1002',
      submittedAt: '2026-08-20T10:18:02', deviceTimestamp: '10:18:02 AM', serverTimestamp: '10:18:07 AM',
      lat: 18.5610, lng: 73.9180, location: 'Phoenix Mall Pune', accuracy: 9,
      comment: 'Branding visible, crowd gathering near display.', status: 'Pending Review'
    },
    {
      id: 'SUB-10003', taskId: 'TSK-10001', activityId: 'ACT-10001', agentId: 'AGT-1003',
      submittedAt: '2026-08-20T10:20:11', deviceTimestamp: '10:20:11 AM', serverTimestamp: '10:20:15 AM',
      lat: 18.5613, lng: 73.9177, location: 'Phoenix Mall Pune', accuracy: 14,
      comment: 'Photo taken with morning crowd.', status: 'Approved'
    },
    {
      id: 'SUB-10004', taskId: 'TSK-10002', activityId: 'ACT-10001', agentId: 'AGT-1002',
      submittedAt: '2026-08-20T14:05:00', deviceTimestamp: '2:05:00 PM', serverTimestamp: '2:05:04 PM',
      lat: 18.5611, lng: 73.9179, location: 'Phoenix Mall Pune', accuracy: 11,
      comment: 'Afternoon footfall increasing.', status: 'Pending Review'
    },
    {
      id: 'SUB-10005', taskId: 'TSK-10006', activityId: 'ACT-10002', agentId: 'AGT-1004',
      submittedAt: '2026-08-20T10:09:00', deviceTimestamp: '10:09:00 AM', serverTimestamp: '10:09:05 AM',
      lat: 18.5158, lng: 73.9376, location: 'Amanora Mall Pune', accuracy: 10,
      comment: 'Setup looks good, display in place.', status: 'Approved'
    },
    {
      id: 'SUB-10006', taskId: 'TSK-10006', activityId: 'ACT-10002', agentId: 'AGT-1005',
      submittedAt: '2026-08-20T10:15:00', deviceTimestamp: '10:15:00 AM', serverTimestamp: '10:15:06 AM',
      lat: 18.5157, lng: 73.9375, location: 'Amanora Mall Pune', accuracy: 22,
      comment: 'Quick shot near the entrance.', status: 'Rejected',
      rejectionReason: 'Photo is blurred and bike branding is not visible. Please resubmit a clearer photo.'
    },
    {
      id: 'SUB-10007', taskId: 'TSK-10011', activityId: 'ACT-10005', agentId: 'AGT-1001',
      submittedAt: '2026-08-05T11:30:00', deviceTimestamp: '11:30:00 AM', serverTimestamp: '11:30:03 AM',
      lat: 12.9345, lng: 77.6101, location: 'Forum Mall Bengaluru', accuracy: 8,
      comment: 'Demo session drew a good crowd.', status: 'Approved'
    }
  ],

  nextIds: { event: 10007, activity: 10007, task: 10012, agent: 1007, submission: 10008 }
};

// Lookup constants used to populate dropdowns and legends across both apps.
const EVENT_STATUSES = ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'];
const ACTIVITY_STATUSES = ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'];
const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Skipped'];
const SUBMISSION_STATUSES = ['Submitted', 'Pending Review', 'Approved', 'Rejected'];

const EVENT_ELEMENTS = ['Product Display', 'Branding', 'Photoshoot', 'Customer Interaction', 'Lead Collection', 'Sampling', 'Demo', 'Other'];
const ACTIVITY_TYPES = ['Mall Promotion', 'Roadshow', 'Product Demo', 'Brand Activation', 'Photoshoot', 'Sampling', 'Customer Engagement', 'Other'];
const ACTIVITY_ELEMENTS = ['Branding', 'Product Display', 'Photoshoot', 'Customer Interaction', 'Lead Generation', 'Product Demonstration', 'Sampling'];
const TASK_TYPES = ['Photo Capture', 'Video Capture', 'Form Submission', 'Customer Interaction', 'Product Demo', 'Lead Collection', 'Checklist', 'Other'];
const EXECUTION_TYPES = ['Once', 'Multiple Times Per Day', 'Daily', 'Custom'];
