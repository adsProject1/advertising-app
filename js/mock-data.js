/**
 * mock-data.js
 * Seed data + lookup constants for the PromoTrack prototype.
 * This is the single source of truth used to initialize localStorage
 * on first run. Both the Desktop Admin app and the Mobile Agent app
 * read/write the same persisted state, so actions in one surface are
 * reflected in the other.
 *
 * Flat data model: there is no Event or Task entity. An Activity is
 * the only unit of work — it carries its own State/AO/Period/Element/
 * Team-Van, and field officers execute it directly. There is no
 * agent/user roster: field officers are assigned to activities
 * offline and simply log into the mobile app with the Activity
 * Number + their mobile number. Submissions are attributed by
 * whatever mobile number was entered at login, and attach directly
 * to the Activity.
 *
 * Activity IDs, Submission IDs and Team Numbers are all plain numeric
 * strings (no letter prefix) by design — kept as strings (not JS
 * numbers) so they still compare correctly against query-param values,
 * which always arrive from the URL as strings.
 */

const MOCK_DATA = {
  activities: [
    {
      id: '10001',
      stateName: 'Maharashtra',
      aoName: 'AO - Pune',
      name: 'Phoenix Mall Pune — Hero Bike Promotion',
      periodFrom: '2026-08-20',
      periodTo: '2026-08-25',
      elementNames: ['Branding', 'Photoshoot'],
      teamVan: 2
    },
    {
      id: '10002',
      stateName: 'Maharashtra',
      aoName: 'AO - Pune',
      name: 'Amanora Mall Pune — Hero Bike Promotion',
      periodFrom: '2026-08-20',
      periodTo: '2026-08-25',
      elementNames: ['Product Display', 'Photoshoot'],
      teamVan: 1
    },
    {
      id: '10003',
      stateName: 'Maharashtra',
      aoName: 'AO - Pune',
      name: 'Seasons Mall Pune — Brand Activation',
      periodFrom: '2026-08-15',
      periodTo: '2026-08-16',
      elementNames: ['Photo Booth Activation'],
      teamVan: 1
    },
    {
      id: '10004',
      stateName: 'Maharashtra',
      aoName: 'AO - Mumbai',
      name: 'Inorbit Mall Mumbai — Diwali Sampling',
      periodFrom: '2026-10-01',
      periodTo: '2026-10-10',
      elementNames: ['Sampling', 'Lead Collection'],
      teamVan: 3
    },
    {
      id: '10005',
      stateName: 'Karnataka',
      aoName: 'AO - Bengaluru',
      name: 'Forum Mall Bengaluru — Cooler Demo',
      periodFrom: '2026-08-01',
      periodTo: '2026-08-10',
      elementNames: ['Product Demonstration'],
      teamVan: 1
    },
    {
      id: '10006',
      stateName: 'Delhi',
      aoName: 'AO - Delhi',
      name: 'Select Citywalk Delhi — Launch Activation',
      periodFrom: '2026-12-28',
      periodTo: '2027-01-05',
      elementNames: ['Branding', 'Product Display'],
      teamVan: 2
    },
    {
      id: '10007',
      stateName: 'Tamil Nadu',
      aoName: 'AO - Chennai',
      name: 'Express Avenue Mall Chennai — Summer Cooler Campaign',
      periodFrom: '2026-08-01',
      periodTo: '2026-08-10',
      elementNames: ['Product Demonstration', 'Video Capture'],
      teamVan: 1
    },
    {
      id: '10008',
      stateName: 'Telangana',
      aoName: 'AO - Hyderabad',
      name: 'GVK One Mall Hyderabad — Monsoon Footwear Drive',
      periodFrom: '2026-08-18',
      periodTo: '2026-08-24',
      elementNames: ['Sampling', 'Product Display'],
      teamVan: 2
    },
    {
      id: '10009',
      stateName: 'West Bengal',
      aoName: 'AO - Kolkata',
      name: 'South City Mall Kolkata — New Year Smartphone Launch',
      periodFrom: '2026-12-15',
      periodTo: '2026-12-31',
      elementNames: ['Branding', 'Product Demonstration'],
      teamVan: 1
    },
    {
      id: '10010',
      stateName: 'Gujarat',
      aoName: 'AO - Ahmedabad',
      name: 'Alpha One Mall Ahmedabad — Independence Day Sale Activation',
      periodFrom: '2026-08-10',
      periodTo: '2026-08-15',
      elementNames: ['Branding', 'Customer Interaction'],
      teamVan: 4
    }
  ],

  submissions: [
    {
      id: '10001', activityId: '10001', mobile: '9876543210', teamNo: '1',
      submittedAt: '2026-08-20T10:12:43', deviceTimestamp: '10:12:43 AM', serverTimestamp: '10:12:49 AM',
      lat: 18.5612, lng: 73.9178, location: 'Phoenix Mall Pune — Hero Bike Promotion, Maharashtra', accuracy: 12,
      captures: [
        { elementNames: ['Branding'], photo: 'captured' },
        { elementNames: ['Photoshoot'], photo: 'captured' }
      ],
      status: 'Approved'
    },
    {
      id: '10002', activityId: '10002', mobile: '9876543214', teamNo: '2',
      submittedAt: '2026-08-20T10:15:00', deviceTimestamp: '10:15:00 AM', serverTimestamp: '10:15:06 AM',
      lat: 18.5158, lng: 73.9376, location: 'Amanora Mall Pune — Hero Bike Promotion, Maharashtra', accuracy: 22,
      captures: [
        { elementNames: ['Product Display', 'Photoshoot'], photo: 'captured' }
      ],
      status: 'Approved'
    },
    {
      id: '10003', activityId: '10005', mobile: '9876543210', teamNo: '3',
      submittedAt: '2026-08-05T11:30:00', deviceTimestamp: '11:30:00 AM', serverTimestamp: '11:30:03 AM',
      lat: 12.9345, lng: 77.6101, location: 'Forum Mall Bengaluru — Cooler Demo, Karnataka', accuracy: 8,
      captures: [
        { elementNames: ['Product Demonstration'], photo: 'captured' }
      ],
      status: 'Approved'
    }
  ],

  // Master list of selectable elements, bilingual (English + Hindi). This
  // is persisted state (not a static lookup constant) because ops can add
  // new elements from the Activity form's element search, and those need
  // to stick around for future activities, not just the current session.
  elements: [
    { en: 'Branding', hi: 'ब्रांडिंग' },
    { en: 'Product Display', hi: 'उत्पाद डिस्प्ले' },
    { en: 'Photoshoot', hi: 'फोटो शूट' },
    { en: 'Video Capture', hi: 'वीडियो कैप्चर' },
    { en: 'Customer Interaction', hi: 'ग्राहक बातचीत' },
    { en: 'Lead Collection', hi: 'लीड संग्रहण' },
    { en: 'Sampling', hi: 'सैंपलिंग' },
    { en: 'Product Demonstration', hi: 'उत्पाद प्रदर्शन' },
    { en: 'Photo Booth Activation', hi: 'फोटो बूथ एक्टिवेशन' },
    { en: 'Roadshow Setup', hi: 'रोडशो सेटअप' }
  ],

  nextIds: { activity: 10011, submission: 10004 }
};

// Lookup constants used to populate dropdowns across both apps.
const STATE_NAMES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const AO_NAMES = [
  'AO - Pune', 'AO - Mumbai', 'AO - Bengaluru', 'AO - Delhi', 'AO - Chennai', 'AO - Hyderabad',
  'AO - Kolkata', 'AO - Ahmedabad'
];
