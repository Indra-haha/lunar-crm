import 'dotenv/config';
import { connectToDatabase, db } from '../lib/db';
import {
  admins,
  customers,
  orders,
  qaChecklists,
  supportTickets,
  leads,
  messageTemplates,
  customerFeedbacks,
  products,
  messageLogs,
  PaymentStatus,
  PipelineStatus,
  TicketCategory,
  TicketStatus,
  InboundChannel,
  AdminRole,
  ProductCategory,
  AcquisitionChannel,
  CustomerSegment,
} from '../lib/schema';
import { hashPassword } from '../lib/auth';

async function seed() {
  console.log('🚀 Starting Lunarchivve CRM PostgreSQL Database Seeder...');
  await connectToDatabase();

  // 1. Clear existing tables in correct order (foreign keys cascade or reverse)
  console.log('🧹 Purging existing tables...');
  await db.delete(customerFeedbacks);
  await db.delete(qaChecklists);
  await db.delete(supportTickets);
  await db.delete(orders);
  await db.delete(leads);
  await db.delete(customers);
  await db.delete(messageTemplates);
  await db.delete(admins);
  await db.delete(products);
  await db.delete(messageLogs);

  // 2. Seed 20+ Masked Realistic Customers
  console.log('👥 Seeding 20+ Customers (UU No. 27/2022 PDP compliant)...');
  const customersData = [
    {
      customerId: 'CUST-001',
      fullName: 'Sarah Aurelia',
      socialHandle: '@sarah_aur',
      phone: '081298448821',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Surabaya',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-002',
      fullName: 'Dimas Pratama',
      socialHandle: '@dimas_pratama',
      phone: '085712343312',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Bandung',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-003',
      fullName: 'Adinda Kirana',
      socialHandle: '@adindakirana',
      phone: '081388779014',
      acquisitionChannel: 'WEB_FORM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Jakarta Selatan',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-004',
      fullName: 'Kevin Sanjaya',
      socialHandle: '@kevinsan',
      phone: '087855444450',
      acquisitionChannel: 'TIKTOK_SHOP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: false,
      city: 'Semarang',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-005',
      fullName: 'Renata Artamevia',
      socialHandle: '@renata_art',
      phone: '082166771129',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Yogyakarta',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-006',
      fullName: 'Budi Santoso',
      socialHandle: '@budis_merch',
      phone: '085699887731',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'DORMANT' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Malang',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-007',
      fullName: 'Clara Monita',
      socialHandle: '@claramonita',
      phone: '081908871234',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Tangerang',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    },
    {
      customerId: 'CUST-008',
      fullName: 'Bagus Wicaksono',
      socialHandle: '@bagus_wicak',
      phone: '081233445566',
      acquisitionChannel: 'WEB_FORM' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Surabaya',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-009',
      fullName: 'Tania Marsya',
      socialHandle: '@taniamarsya',
      phone: '085799112233',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Bekasi',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-010',
      fullName: 'Rizky Febrian',
      socialHandle: '@rizkyfeb',
      phone: '081377441199',
      acquisitionChannel: 'TIKTOK_SHOP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: false,
      city: 'Depok',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-011',
      fullName: 'Maya Safitri',
      socialHandle: '@mayasaf',
      phone: '082211559988',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Bogor',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-012',
      fullName: 'Fajar Nugraha',
      socialHandle: '@fajarnug',
      phone: '081299334411',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'DORMANT' as CustomerSegment,
      acceptsMarketing: false,
      city: 'Solo',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-013',
      fullName: 'Gita Gutawa',
      socialHandle: '@gitagut',
      phone: '087788112299',
      acquisitionChannel: 'WEB_FORM' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Jakarta Barat',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-014',
      fullName: 'Hendra Setiawan',
      socialHandle: '@hendraset',
      phone: '081344556677',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Denpasar',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-015',
      fullName: 'Indah Permatasari',
      socialHandle: '@indahpermata',
      phone: '085611223344',
      acquisitionChannel: 'TIKTOK_SHOP' as AcquisitionChannel,
      segment: 'DORMANT' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Medan',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-016',
      fullName: 'Joko Anwar',
      socialHandle: '@jokoanw',
      phone: '081277889900',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Jakarta Pusat',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-017',
      fullName: 'Larasati Putri',
      socialHandle: '@larasputri',
      phone: '082155667788',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Semarang',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-018',
      fullName: 'Muhammad Ilham',
      socialHandle: '@ilhammhd',
      phone: '087811229944',
      acquisitionChannel: 'WEB_FORM' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: false,
      city: 'Makassar',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-019',
      fullName: 'Nadia Saphira',
      socialHandle: '@nadiasap',
      phone: '081399001122',
      acquisitionChannel: 'TIKTOK_SHOP' as AcquisitionChannel,
      segment: 'REGULAR' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Palembang',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-020',
      fullName: 'Oki Setiana',
      socialHandle: '@okiset',
      phone: '085744556611',
      acquisitionChannel: 'WHATSAPP' as AcquisitionChannel,
      segment: 'DORMANT' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Bandung',
      avatarUrl: '',
    },
    {
      customerId: 'CUST-021',
      fullName: 'Putri Marino',
      socialHandle: '@putrimar',
      phone: '081288990033',
      acquisitionChannel: 'INSTAGRAM_DM' as AcquisitionChannel,
      segment: 'VIP_LOYAL' as CustomerSegment,
      acceptsMarketing: true,
      city: 'Jakarta Selatan',
      avatarUrl: '',
    },
  ];

  const createdCustomers = await db.insert(customers).values(customersData).returning();
  console.log(`✅ Created ${createdCustomers.length} customers.`);

  // 3. Seed 10 Orders across the 5 Kanban stages
  console.log('📦 Seeding Orders across 5 pipeline stages...');
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const ordersData = [
    // Stage 1: ORDER_MASUK
    {
      orderCode: '#LUN-ORD-112',
      customerId: createdCustomers[1].id, // Dimas
      productName: 'Acrylic Keychain 6cm',
      variantName: 'Glitter Sparkle',
      quantity: 3,
      totalPrice: 75000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Double sided with silver star clasp',
      designUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'ORDER_MASUK' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 1 * dayMs),
      paymentStatus: 'DP_PAID' as PaymentStatus,
    },
    {
      orderCode: '#LUN-ORD-115',
      customerId: createdCustomers[2].id, // Adinda
      productName: 'Photocard Holder B8',
      variantName: 'Custom Ribbon Hologram',
      quantity: 2,
      totalPrice: 120000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Pastel purple theme with chain clasp',
      designUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'ORDER_MASUK' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
      paymentStatus: 'LUNAS' as PaymentStatus,
    },
    {
      orderCode: '#LUN-ORD-117',
      customerId: createdCustomers[9].id, // Rizky
      productName: 'Hard Enamel Pin 4cm',
      variantName: 'Gold Plated Butterfly Clasp',
      quantity: 1,
      totalPrice: 45000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Backing card customized',
      designUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'ORDER_MASUK' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 1 * dayMs),
      paymentStatus: 'DP_PAID' as PaymentStatus,
    },

    // Stage 2: DESAIN_APPROVAL
    {
      orderCode: '#LUN-ORD-109',
      customerId: createdCustomers[0].id, // Sarah
      productName: 'A3 Artprint Hologram',
      variantName: 'Rainbow Pearl Art Cartoon 310g',
      quantity: 5,
      totalPrice: 145000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Waiting ACC cutline & foil positioning',
      designUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'DESAIN_APPROVAL' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 1.5 * dayMs),
      paymentStatus: 'LUNAS' as PaymentStatus,
    },
    {
      orderCode: '#LUN-ORD-111',
      customerId: createdCustomers[3].id, // Kevin
      productName: 'Mini Standee Akrilik 10cm',
      variantName: 'Dua Sisi Base Bintang',
      quantity: 2,
      totalPrice: 90000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Artwork approved, ready to send vendor',
      designUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'DESAIN_APPROVAL' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 2 * dayMs),
      paymentStatus: 'LUNAS' as PaymentStatus,
    },

    // Stage 3: PRODUKSI_VENDOR (Includes CRITICAL OVERDUE >3 days)
    {
      orderCode: '#LUN-ORD-098',
      customerId: createdCustomers[4].id, // Renata
      productName: 'Akrilik Diorama 15cm',
      variantName: 'Laser Cut Multi-Layer Base',
      quantity: 4,
      totalPrice: 320000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Vendor UV delay: perlu follow up segera',
      designUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'PRODUKSI_VENDOR' as PipelineStatus,
      stuckAlert: true,
      enteredStageAt: new Date(now - 5 * dayMs), // 5 DAYS AGO (>3 days stuck!)
      paymentStatus: 'LUNAS' as PaymentStatus,
      vendorName: 'Vendor Akrilik Jaya (Surabaya)',
    },
    {
      orderCode: '#LUN-ORD-105',
      customerId: createdCustomers[7].id, // Bagus
      productName: 'Artprint A4 Foil Emas',
      variantName: 'Art Cartoon 310g Doff',
      quantity: 10,
      totalPrice: 210000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'On schedule cetak vendor',
      designUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'PRODUKSI_VENDOR' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 2 * dayMs),
      paymentStatus: 'LUNAS' as PaymentStatus,
      vendorName: 'Vendor Print Cepat Express',
    },
    {
      orderCode: '#LUN-ORD-107',
      customerId: createdCustomers[8].id, // Tania
      productName: 'Epoxy Resin Keychain 5cm',
      variantName: 'Rose Gold Clasp + Glitter',
      quantity: 2,
      totalPrice: 85000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Proses curing resin maklon',
      designUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'PRODUKSI_VENDOR' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 1 * dayMs),
      paymentStatus: 'LUNAS' as PaymentStatus,
      vendorName: 'Vendor Akrilik Jaya',
    },

    // Stage 4: QA_PACKING
    {
      orderCode: '#LUN-ORD-108',
      customerId: createdCustomers[2].id, // Adinda
      productName: 'Acrylic Stand / Keychain Sparkle 6cm',
      variantName: 'Glitter Sand Finish + Rose Gold Star Clasp',
      quantity: 2,
      totalPrice: 75000,
      batchName: 'Batch #12 Keychain & Artprint',
      briefNotes: 'Custom Backing Card (Foil Holo)',
      designUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'QA_PACKING' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 12 * 60 * 60 * 1000), // 12 hours ago
      paymentStatus: 'LUNAS' as PaymentStatus,
    },

    // Stage 5: SELESAI
    {
      orderCode: '#LUN-ORD-064',
      customerId: createdCustomers[0].id, // Sarah
      productName: 'Custom Standee & Artprint (Batch 11)',
      variantName: 'Double Side Acrylic 12cm',
      quantity: 3,
      totalPrice: 215000,
      batchName: 'Batch #11 Summer Merch',
      briefNotes: 'Selesai terkirim via J&T Express JNT998822',
      designUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80',
      pipelineStatus: 'SELESAI' as PipelineStatus,
      stuckAlert: false,
      enteredStageAt: new Date(now - 14 * dayMs),
      paymentStatus: 'LUNAS' as PaymentStatus,
    },
  ];

  const createdOrders = await db.insert(orders).values(ordersData).returning();
  console.log(`✅ Created ${createdOrders.length} orders across 5 stages.`);

  // 4. Seed QA Checklist Records
  console.log('🔍 Seeding QA Checklists...');
  await db.insert(qaChecklists).values([
    {
      orderId: createdOrders[8].id, // #LUN-ORD-108 in QA_PACKING
      specMatched: true,
      quantityMatched: true,
      noDefects: true,
      peelOffFilmChecked: true,
      photoProofUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      inspectorName: 'Said Najih',
      notes: 'Sedikit residu debu statis maklon - telah dibersihkan kain mikrofiber steril.',
      checkedAt: new Date(),
    },
    {
      orderId: createdOrders[9].id, // #LUN-ORD-064 in SELESAI
      specMatched: true,
      quantityMatched: true,
      noDefects: true,
      peelOffFilmChecked: true,
      photoProofUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
      inspectorName: 'Said Najih',
      notes: 'QC Lolos sempurna tanpa cacat.',
      checkedAt: new Date(now - 14 * dayMs),
    },
  ]);

  // 5. Seed Support Tickets
  console.log('🎫 Seeding 5 Support Tickets...');
  await db.insert(supportTickets).values([
    {
      ticketCode: '#LUN-TK-042',
      orderId: createdOrders[0].id,
      category: 'CATEGORY_A' as TicketCategory,
      issueDetail: 'Clasp patah saat pengiriman, akrilik tergores sudut kanan bawah.',
      assignedPIC: 'Said Najih',
      status: 'OPEN' as TicketStatus,
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      ticketCode: '#LUN-TK-039',
      orderId: createdOrders[5].id,
      category: 'CATEGORY_B' as TicketCategory,
      issueDetail: 'Paket tertahan di hub transit kurir lebih dari 4 hari tanpa status gerak.',
      assignedPIC: 'Diana Rosita',
      status: 'IN_PROGRESS' as TicketStatus,
      createdAt: new Date(now - 8 * 60 * 60 * 1000),
    },
    {
      ticketCode: '#LUN-TK-035',
      orderId: createdOrders[6].id,
      category: 'CATEGORY_C' as TicketCategory,
      issueDetail: 'Tanya panduan merawat lapisan epoxy resin agar tidak menguning di bawah sinar matahari.',
      assignedPIC: 'Nadia Putri',
      status: 'RESOLVED' as TicketStatus,
      resolvedAt: new Date(now - 1 * 60 * 60 * 1000),
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      ticketCode: '#LUN-TK-002',
      orderId: createdOrders[9].id,
      category: 'CATEGORY_A' as TicketCategory,
      issueDetail: 'Varian clasp tertukar (Silver diganti Gold Star sesuai request pembeli).',
      assignedPIC: 'Said Najih',
      status: 'RESOLVED' as TicketStatus,
      resolvedAt: new Date(now - 12 * dayMs),
      createdAt: new Date(now - 12 * dayMs - 45 * 60 * 1000),
    },
    {
      ticketCode: '#LUN-TK-028',
      orderId: createdOrders[3].id,
      category: 'CATEGORY_C' as TicketCategory,
      issueDetail: 'Konfirmasi perubahan alamat pengiriman ke kantor sebelum resi dicetak.',
      assignedPIC: 'Said Najih',
      status: 'RESOLVED' as TicketStatus,
      resolvedAt: new Date(now - 2 * dayMs),
      createdAt: new Date(now - 2 * dayMs - 1.2 * 60 * 60 * 1000),
    },
  ]);

  // 6. Seed Inbound Leads
  console.log('💬 Seeding Inbound Leads & FRT timestamps...');
  await db.insert(leads).values([
    {
      prospectName: 'Renata Agatha',
      socialHandle: '@renata_art',
      phone: '081298448821',
      inboundChannel: 'INSTAGRAM_DM' as InboundChannel,
      messagePreview: 'Halo min, mau tanya slot pre-order keychain sparkle 50 pcs untuk merchandise event bulan depan masih ada?',
      inboundAt: new Date(now - 28 * 60 * 1000),
      status: 'NEW',
    },
    {
      prospectName: 'Kevin Surya',
      socialHandle: '@kevin.san',
      phone: '081311223344',
      inboundChannel: 'TIKTOK_SHOP' as InboundChannel,
      messagePreview: 'Pagi kak, artprint foil hologram minimal order berapa pcs ya? Ada katalog pricelist?',
      inboundAt: new Date(now - 14 * 60 * 1000),
      status: 'NEW',
    },
    {
      prospectName: 'Clara Monita',
      socialHandle: '@claramonita',
      phone: '081908871234',
      inboundChannel: 'WHATSAPP' as InboundChannel,
      messagePreview: 'Hai Lunarchivve! Mau repeat order photocard holder batch 12 kemarin, format ordernya kirim ke mana?',
      inboundAt: new Date(now - 8 * 60 * 1000),
      firstResponseAt: new Date(now - 3 * 60 * 1000),
      status: 'CONTACTED',
    },
    {
      prospectName: 'Dimas Pratama',
      socialHandle: '@dimas_pratama',
      phone: '085712343312',
      inboundChannel: 'INSTAGRAM_DM' as InboundChannel,
      messagePreview: 'Sudah transfer DP untuk keychain 3 pcs ya min, bukti slip saya kirim di DM.',
      inboundAt: new Date(now - 120 * 60 * 1000),
      firstResponseAt: new Date(now - 110 * 60 * 1000),
      status: 'CONVERTED',
      convertedCustomerId: createdCustomers[1].id,
    },
    {
      prospectName: 'Gita Saraswati',
      socialHandle: '@gitasaras',
      phone: '087788112299',
      inboundChannel: 'WHATSAPP' as InboundChannel,
      messagePreview: 'Bisa custom akrilik 20cm dengan standee kayu mini? Estimasi pengerjaan berapa hari?',
      inboundAt: new Date(now - 45 * 60 * 1000),
      firstResponseAt: new Date(now - 36 * 60 * 1000),
      status: 'CONTACTED',
    },
  ]);

  // 7. Seed WhatsApp Message Templates
  console.log('📋 Seeding WhatsApp Message Templates...');
  await db.insert(messageTemplates).values([
    {
      title: 'Sapaan Hangat & Info Katalog Pre-Order',
      triggerKey: 'KATALOG_PO',
      category: 'katalog',
      content:
        'Halo kak {nama}! Terima kasih sudah menghubungi Lunarchivve Merch & Studio ✨ Pre-order {batch_no} sedang dibuka s.d 25 Mei! Yuk cek katalog lengkap & pricelist di: {link_katalog}. Ada merchandise custom yang ingin kakak pesan hari ini?',
    },
    {
      title: 'Konfirmasi Pembayaran DP & Detail Brief Desain',
      triggerKey: 'KONFIRMASI_BAYAR',
      category: 'pembayaran',
      content:
        'Halo kak {nama}! Pembayaran DP untuk pesanan {order_id} sebesar {nominal_dp} telah kami verifikasi ✅ Mohon kirimkan file artwork format CMYK (resolusi min. 300 DPI) beserta cutline panduan ke email kami atau link Google Drive ya kak.',
    },
    {
      title: 'Update Keterlambatan Vendor & Permohonan Maaf',
      triggerKey: 'UPDATE_VENDOR_DELAY',
      category: 'eskalasi',
      content:
        'Halo kak {nama}, kami ingin mengabarkan update terkait pesanan {order_id}. Saat ini proses UV printing di vendor mengalami antrean mesin sehingga ada penyesuaian estimasi kirim menjadi {estimasi_baru}. Kami memohon maaf atas keterlambatan ini dan menyertakan bonus freebie ekstra di paket kakak 🙏',
    },
    {
      title: 'Notifikasi Lolos QA & Foto Konfirmasi Siap Kirim',
      triggerKey: 'NOTIF_QA_SELESAI',
      category: 'qa',
      content:
        'Kabar gembira kak {nama}! Pesanan merchandise kustom {order_id} telah selesai diproduksi dan lolos uji kontrol kualitas fisik (100% aman). Paket saat ini sedang dipacking aman dengan bubble wrap tebal dan siap diserahkan ke kurir sore ini 📦✨',
    },
  ]);

  // 8. Seed Customer Feedback (CSAT & Testimonial Showcase)
  console.log('⭐ Seeding Customer Feedbacks (CSAT)...');
  await db.insert(customerFeedbacks).values([
    {
      orderId: createdOrders[9].id, // Sarah Aurelia
      customerName: 'Sarah Aurelia',
      socialHandle: '@sarah_aur',
      city: 'Surabaya',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      comment:
        'Hasil akriliknya jernih banget, glitternya halus dan ga bikin buram artwork! Packaging super aman pake backing card hologram premium. Definitely repeat order di Batch 12!',
      isPinnedForSocial: true,
    },
    {
      orderId: createdOrders[0].id, // Dimas Pratama
      customerName: 'Dimas Pratama',
      socialHandle: '@dimas_pratama',
      city: 'Bandung',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      comment:
        'Clasp star gold-nya kokoh banget, warna cetakan tajam mirip banget sama mockup digital. CS-nya sangat responsif pas diajak konsultasi cutline. Rekomendasi buat merch anime!',
      isPinnedForSocial: true,
    },
    {
      orderId: createdOrders[1].id, // Adinda Kirana
      customerName: 'Adinda Kirana',
      socialHandle: '@adindakirana',
      city: 'Jakarta Selatan',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      comment:
        'Photocard holder B8 custom ribbon-nya rapi banget pengerjaannya! Tidak ada lem bleberan atau baret di mika akriliknya. Dapet freebies sticker lucu juga.',
      isPinnedForSocial: false,
    },
    {
      orderId: createdOrders[4].id, // Kevin Surya
      customerName: 'Kevin Surya',
      socialHandle: '@kevin.san',
      city: 'Semarang',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      rating: 4,
      comment:
        'Kualitas cetak standee bagus, potongan akrilik presisi. Sempat ada delay ekspedisi 1 hari tapi tim CS Lunarchivve langsung proaktif kasih update.',
      isPinnedForSocial: false,
    },
    {
      orderId: createdOrders[6].id, // Bagus Wicaksono
      customerName: 'Bagus Wicaksono',
      socialHandle: '@bagus_wicak',
      city: 'Surabaya',
      avatarUrl: '',
      rating: 5,
      comment:
        'Foil emas di artprint-nya menyala mewah dan tebal kertasnya pas 310g doff. Sangat puas dengan standar QC Lunarchivve!',
      isPinnedForSocial: false,
    },
  ]);

  // 9. Seed Default Admins
  console.log('🔐 Seeding Default Admins...');
  const adminPassword = hashPassword('admin123');
  const staffPassword = hashPassword('staff123');

  await db.insert(admins).values([
    {
      username: 'admin',
      email: 'admin@lunarchivve.com',
      passwordHash: adminPassword.hash,
      salt: adminPassword.salt,
      fullName: 'Nadia Putri, S.Ds.',
      role: 'SUPER_ADMIN' as AdminRole,
      avatarUrl:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      isActive: true,
    },
    {
      username: 'staff',
      email: 'staff@lunarchivve.com',
      passwordHash: staffPassword.hash,
      salt: staffPassword.salt,
      fullName: 'Sarah Aurelia',
      role: 'STUDIO_ADMIN' as AdminRole,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isActive: true,
    },
  ]);

  // 10. Seed Master Products & Variants
  console.log('📦 Seeding Master Products & Variants...');
  await db.insert(products).values([
    {
      productCode: 'PRD-001',
      name: 'Acrylic Standee 15cm Custom',
      category: 'AKRILIK' as ProductCategory,
      basePrice: 65000,
      vendorName: 'Maklon Akrilik Subur',
      variants: [
        { name: '1 Sisi Doff 3mm', additionalPrice: 0, stockOrQuota: 200 },
        { name: '2 Sisi Glossy 4mm', additionalPrice: 10000, stockOrQuota: 150 },
        { name: 'Glitter Sparkle Sandwich 4mm', additionalPrice: 15000, stockOrQuota: 100 },
      ],
      batchAvailable: 'Batch #12 Open',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80',
      description: 'Standee akrilik potong laser presisi tinggi dengan dudukan base bulat/persegi transparan.',
    },
    {
      productCode: 'PRD-002',
      name: 'Photocard Holder B8 Ribbon Custom',
      category: 'PHOTOCARD' as ProductCategory,
      basePrice: 45000,
      vendorName: 'Studio Handmade Bandung',
      variants: [
        { name: 'Pastel Ribbon Ribbon Standar', additionalPrice: 0, stockOrQuota: 150 },
        { name: 'Gothic Lolita Ribbon Lace', additionalPrice: 8000, stockOrQuota: 100 },
        { name: 'Pearl & Crystal Charm Luxury', additionalPrice: 12000, stockOrQuota: 80 },
      ],
      batchAvailable: 'Batch #12 Open',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
      description: 'Holder photocard tebal ukuran B8 dengan hiasan pita satin premium dan gantungan ballchain warna.',
    },
    {
      productCode: 'PRD-003',
      name: 'Artprint A5 310g Foil Emas / Hologram',
      category: 'STATIONERY' as ProductCategory,
      basePrice: 28000,
      vendorName: 'Percetakan Grafika Mandiri',
      variants: [
        { name: 'Hot Stamp Gold Foil', additionalPrice: 0, stockOrQuota: 300 },
        { name: 'Rainbow Hologram Foil', additionalPrice: 5000, stockOrQuota: 250 },
        { name: 'Silver Starlight Doff', additionalPrice: 3000, stockOrQuota: 200 },
      ],
      batchAvailable: 'Batch #12 Open',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&auto=format&fit=crop&q=80',
      description: 'Art carton 310gsm laminasi doff beludru dengan aksen foil berkilau premium.',
    },
    {
      productCode: 'PRD-004',
      name: 'Keychain Akrilik Sandwich 6cm',
      category: 'AKRILIK' as ProductCategory,
      basePrice: 32000,
      vendorName: 'Maklon Akrilik Subur',
      variants: [
        { name: 'Single Charm Ring O', additionalPrice: 0, stockOrQuota: 400 },
        { name: 'Double Charm + Mini Bell', additionalPrice: 6000, stockOrQuota: 300 },
        { name: 'Shaker Charm Oil Floating', additionalPrice: 16000, stockOrQuota: 150 },
      ],
      batchAvailable: 'Batch #12 Open',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=400&auto=format&fit=crop&q=80',
      description: 'Gantungan kunci akrilik sandwich cetak bolak-balik aman dari goresan dengan ring tebal.',
    },
    {
      productCode: 'PRD-005',
      name: 'Custom T-Shirt Heavyweight 24s DTF',
      category: 'APPAREL' as ProductCategory,
      basePrice: 95000,
      vendorName: 'Vendor Tekstil Bandung',
      variants: [
        { name: 'Sablon DTF High-Res A3', additionalPrice: 0, stockOrQuota: 100 },
        { name: 'Bordir Komputer Dada Kiri', additionalPrice: 15000, stockOrQuota: 80 },
        { name: 'Puff 3D Print Premium', additionalPrice: 20000, stockOrQuota: 50 },
      ],
      batchAvailable: 'Batch #12 Open',
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80',
      description: 'Kaos katun combed 24s gramasi tebal tidak menerawang dengan sablon DTF anti-retak.',
    },
  ]);

  // 11. Seed WhatsApp Message Audit Logs
  console.log('📱 Seeding WhatsApp Message Audit Logs...');
  await db.insert(messageLogs).values([
    {
      recipientName: 'Sarah Aurelia',
      recipientPhone: '081298448821',
      templateKey: 'WELCOME_LEAD',
      templateTitle: 'Sapaan Cepat & Katalog PO',
      messageContent: 'Halo Sarah Aurelia! Terima kasih sudah menghubungi Lunarchivve Studio. Katalog PO Batch #12 sudah open ya.',
      channel: 'WHATSAPP',
      status: 'DELIVERED',
      dispatchedBy: 'Nadia Putri',
      referenceType: 'LEAD',
    },
    {
      recipientName: 'Dimas Pratama',
      recipientPhone: '085712343312',
      templateKey: 'ORDER_CONFIRMED',
      templateTitle: 'Konfirmasi DP & Pesanan Diterima',
      messageContent: 'Pesanan #LUN-ORD-002 Anda telah kami terima dan masuk tahap Desain Approval. Terima kasih!',
      channel: 'WHATSAPP',
      status: 'DELIVERED',
      dispatchedBy: 'Sarah Aurelia',
      referenceType: 'ORDER',
    },
    {
      recipientName: 'Adinda Kirana',
      recipientPhone: '081388779014',
      templateKey: 'QA_PASSED',
      templateTitle: 'Pemberitahuan Lolos QC & Siap Kirim',
      messageContent: 'Kabar gembira! Pesanan #LUN-ORD-003 telah lolos 4 inspeksi QC kami dan siap di-pickup ekspedisi.',
      channel: 'WHATSAPP',
      status: 'DELIVERED',
      dispatchedBy: 'Said Najih',
      referenceType: 'ORDER',
    },
    {
      recipientName: 'Rizky Ramadhan',
      recipientPhone: '081233449901',
      templateKey: 'DORMANT_PROMO',
      templateTitle: 'Voucher PO Batch #12 Eksklusif',
      messageContent: 'Halo Kak Rizky! Khusus pelanggan setia, nikmati diskon early bird 15% untuk PO Batch #12 minggu ini.',
      channel: 'WHATSAPP',
      status: 'SENT',
      dispatchedBy: 'Nadia Putri',
      referenceType: 'PROMO_DORMANT',
    },
  ]);

  console.log('🎉 PostgreSQL Seeding successfully completed!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
