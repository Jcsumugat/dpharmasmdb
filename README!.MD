[
  'sessions',        'p_o_s_transactions',
  'cache_locks',     'suppliers',
  'users',           'notifications',
  'job_batches',     'dps',
  'jobs',            'orders',
  'stock_movements', 'products',
  'conversations',   'failed_jobs',
  'prescriptions',   'cache',
  'categories',      'migrations'
]


=== p_o_s_transactions (11) ===
{
  _id: ObjectId('69363ac421fe92f1ae0506b2'),
  transaction_id: 'TXN-20251208-0001',
  customer_type: 'walk_in',
  customer_name: null,
  items: '[{"product_id":"6932632dc1fce6a15208bca3","product_name":"Biogesic 500mg Tablet","brand_name":"Biogesic","quantity":2,"unit_price":6,"total_price":12}]',
  subtotal: 12,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 12,
  amount_paid: 20,
  change_amount: 8,
  payment_method: 'cash',
  status: 'completed',
  notes: null,
  processed_by: '6933940c22a6add6f4022392',
  updated_at: 2025-12-08T02:41:08.005Z,
  created_at: 2025-12-08T02:41:08.005Z
}

=== products (2) ===
{
  _id: ObjectId('6932632dc1fce6a15208bca3'),
  product_name: 'Biogesic 500mg Tablet',
  product_code: 'P9143',
  generic_name: 'Paracetamol',
  brand_name: 'Biogesic',
  manufacturer: 'Other',
  product_type: 'OTC',
  form_type: 'Tablet',
  dosage_unit: '500mg',
  classification: 2,
  category_id: null,
  supplier_id: '69325954c1fce6a15208bca2',
  reorder_level: 50,
  unit: 'box',
  unit_quantity: 120,
  storage_requirements: 'Room Temperature',
  stock_quantity: 257,
  batches: [
    {
      batch_number: 'BTH-202512-P9143-001',
      expiration_date: '2027-08-08',
      quantity_received: 20,
      quantity_remaining: 17,
      unit_cost: 4,
      sale_price: '6',
      received_date: '2025-12-06',
      supplier_id: '69325954c1fce6a15208bca2',
      notes: null,
      expiration_notification_sent_at: null,
      created_at: 2025-12-06T02:40:53.865Z,
      updated_at: 2025-12-06T16:44:32.432Z,
      _id: ObjectId('693397b522a6add6f4022393')
    },
    {
      batch_number: 'BTH-202512-P9143-002',
      expiration_date: '2027-09-09',
      quantity_received: 240,
      quantity_remaining: 240,
      unit_cost: 5,
      sale_price: 7,
      received_date: '2025-12-06',
      supplier_id: '69325954c1fce6a15208bca2',
      notes: null,
      expiration_notification_sent_at: null,
      created_at: 2025-12-06T18:39:53.233Z,
      updated_at: 2025-12-06T18:39:53.233Z,
      _id: ObjectId('693478793d1ebd2b63023152')
    }
  ],
  updated_at: 2025-12-08T02:57:21.653Z,
  created_at: 2025-12-05T04:44:29.674Z
}

=== orders (7) ===
{
  _id: ObjectId('6935042be4770874310b69e6'),
  order_id: 'RX00002',
  prescription_id: '6934f4d4e4770874310b69e4',
  customer_id: '6933940c22a6add6f4022392',
  items: '[{"product_id":"6933b7f9ce522a4d460ddeb2","product_name":"Ascorbic Acid","brand_name":"Multi Vitamins Plus Minerals","quantity":2,"unit_price":17,"total_price":34,"status":"available"}]',
  status: 'ready_for_pickup',
  payment_method: 'cash',
  payment_status: 'pending',
  updated_at: 2025-12-07T04:36:47.156Z,
  created_at: 2025-12-07T04:35:55.448Z
}

=== users (2) ===
{
  _id: ObjectId('69319a4ece01cd8ba8b6d271'),
  email: 'mjspharmacy@gmail.com',
  password: '$2y$12$FKCuVVP2edCsMhGiP3Rvruvvk2E55rI3sC6vUl8aGrKUf9YyK60GG',
  role: 'admin',
  name: "MJ's Pharmacy Admin",
  email_verified_at: null,
  last_login: 2025-12-08T01:39:14.230Z,
  created_at: 2025-12-04T14:27:26.202Z,
  updated_at: 2025-12-08T01:39:14.230Z,
  status: 'active'
}

=== suppliers (1) ===
{
  _id: ObjectId('69325954c1fce6a15208bca2'),
  total_orders: 0,
  on_time_delivery_rate: Decimal128('0.00'),
  name: 'Mercury Drug Store',
  contact_person: 'Mrs. Jane Yap',
  phone: '09567460163',
  email: 'msjane@gmail.com',
  address: 'Culasi Antique, Philippines',
  created_at: 2025-12-05T04:02:28.931Z,
  updated_at: 2025-12-05T04:02:28.931Z
}

=== stock_movements (6) ===
{
  _id: ObjectId('693397b522a6add6f4022394'),
  product_id: '6932632dc1fce6a15208bca3',
  batch_id: ObjectId('693397b522a6add6f4022393'),
  type: 'purchase',
  quantity: 20,
  reference_type: 'purchase',
  reference_id: null,
  notes: 'New batch added: BTH-202512-P9143-001',
  performed_by: '69319a4ece01cd8ba8b6d271',
  timestamp: 2025-12-06T02:40:53.869Z,
  updated_at: 2025-12-06T02:40:53.870Z,
  created_at: 2025-12-06T02:40:53.870Z
}

=== prescriptions (2) ===
{
  _id: ObjectId('6934e8f7e4770874310b69e2'),
  prescription_number: 'RX00001',
  customer_id: '6933940c22a6add6f4022392',
  file_path: 'prescriptions/2025/12/3zhELwgERcrI5IXPH3NaB10tgzilCqiDmvG6yX1B.jpg',
  original_filename: 'prescription.jpg',
  file_mime_type: 'image/jpeg',
  file_size: 55885,
  is_encrypted: false,
  mobile_number: '09567460163',
  notes: null,
  order_type: 'prescription',
  status: 'pending',
  token: '9f0aqFvRhXsOH97ktG3ocKr6inKtQ5cz',
  items: '[]',
  updated_at: 2025-12-07T02:39:51.096Z,
  created_at: 2025-12-07T02:39:51.096Z
}

=== notifications (14) ===
{
  _id: ObjectId('6934e8f7e4770874310b69e3'),
  user_id: '69319a4ece01cd8ba8b6d271',
  type: 'prescription_uploaded',
  title: 'New Prescription Uploaded',
  message: 'A prescription has been uploaded by  ',
  data: '{"prescription_id":"6934e8f7e4770874310b69e2","action_url":"\\/admin\\/prescriptions","action_text":"Review Prescription"}',
  is_read: false,
  priority: 'high',
  action_url: '/admin/prescriptions',
  action_text: 'Review Prescription',
  updated_at: 2025-12-07T02:39:51.114Z,
  created_at: 2025-12-07T02:39:51.114Z
}

=== conversations (1) ===
{
  _id: ObjectId('69355fccf7974a85050361d2'),
  customer_id: '6933940c22a6add6f4022392',
  admin_id: null,
  title: 'Prescription Inquiry',
  type: 'prescription_inquiry',
  status: 'active',
  priority: 'normal',
  messages: '[{"_id":{"$oid":"69356006f7974a85050361d3"},"timestamp":"2025-12-07T11:07:50.357256Z","is_read":true,"sender_type":"customer","sender_id":"6933940c22a6add6f4022392","message":"good afternoon maam, heres the more clearer photo of my prescription po","message_type":"file","attachments":[{"file_name":"prescription.jpg","file_path":"chat-attachments\\/2025\\/12\\/vQBTh0YGnA6FAEEJKx9n6gTz1ZEdjvG70N96rDE2.jpg","file_size":55885,"file_type":"jpg","mime_type":"image\\/jpeg"}],"is_internal_note":false},{"_id":{"$oid":"69356276f7974a85050361d4"},"timestamp":"2025-12-07T11:18:14.150244Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Thank you maam\\/sir.","message_type":"text","attachments":[],"is_internal_note":"0"},{"_id":{"$oid":"6935628cf7974a85050361d5"},"timestamp":"2025-12-07T11:18:36.840676Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Thank you maam\\/sir","message_type":"text","attachments":[],"is_internal_note":"0"},{"_id":{"$oid":"693563a1f7974a85050361d6"},"timestamp":"2025-12-07T11:23:13.136184Z","is_read":true,"sender_type":"system","sender_id":null,"message":"Conversation marked as active","message_type":"system"},{"_id":{"$oid":"6935654bf7974a85050361d7"},"timestamp":"2025-12-07T11:30:19.049801Z","is_read":true,"sender_type":"system","sender_id":null,"message":"Conversation marked as active","message_type":"system"},{"_id":{"$oid":"69356552f7974a85050361d8"},"timestamp":"2025-12-07T11:30:26.599229Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Done","message_type":"text","attachments":[],"is_internal_note":"0"},{"_id":{"$oid":"693566eef7974a85050361d9"},"timestamp":"2025-12-07T11:37:18.804248Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Test","message_type":"text","attachments":[],"is_internal_note":"false"},{"_id":{"$oid":"693566f8f7974a85050361da"},"timestamp":"2025-12-07T11:37:28.611357Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"test","message_type":"text","attachments":[],"is_internal_note":"false"},{"_id":{"$oid":"693566fdf7974a85050361db"},"timestamp":"2025-12-07T11:37:33.677355Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Test","message_type":"text","attachments":[],"is_internal_note":"true"},{"_id":{"$oid":"6935678ef7974a85050361dc"},"timestamp":"2025-12-07T11:39:58.806081Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"test","message_type":"text","attachments":[],"is_internal_note":false},{"_id":{"$oid":"69356799f7974a85050361dd"},"timestamp":"2025-12-07T11:40:09.802138Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Test","message_type":"text","attachments":[],"is_internal_note":true},{"_id":{"$oid":"693567a0f7974a85050361de"},"timestamp":"2025-12-07T11:40:16.048074Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Test","message_type":"text","attachments":[],"is_internal_note":false},{"_id":{"$oid":"693567c1f7974a85050361df"},"timestamp":"2025-12-07T11:40:49.235168Z","is_read":true,"sender_type":"admin","sender_id":"69319a4ece01cd8ba8b6d271","message":"Note","message_type":"text","attachments":[],"is_internal_note":true}]',
  last_message_at: 2025-12-07T11:40:49.235Z,
  updated_at: 2025-12-07T11:40:50.381Z,
  created_at: 2025-12-07T11:06:52.193Z
}

=== categories (0) ===
