import { db } from '../src/lib/db';
import { CommerceOrder } from '../src/types';

async function main() {
  const workspaceId = 'ws_acme_corp';
  
  const sampleOrders: CommerceOrder[] = [
    {
      id: 'ord_sample_84920',
      workspace_id: workspaceId,
      order_number: '#ORD-84920',
      customer_id: 'cus_84920',
      customer_email: 'priya.sharma@example.com',
      customer_name: 'Priya Sharma',
      customer_phone: '+91 98765 43210',
      total_amount: 4999.00,
      currency: 'INR',
      status: 'PAID',
      payment_status: 'PAID',
      fulfillment_status: 'IN_TRANSIT',
      shipping_address: 'Flat 402, Green Glen Heights, Bellandur, Bengaluru, KA 560103',
      tracking_number: 'TRK-BLUEDART-84920',
      carrier: 'Blue Dart Express',
      items: [
        {
          product_id: 'prod_cyberpunk_01',
          title: 'Cyberpunk Waterproof Tactical Shell Jacket',
          quantity: 1,
          price: 4999.00
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString()
    },
    {
      id: 'ord_sample_72109',
      workspace_id: workspaceId,
      order_number: '#ORD-72109',
      customer_id: 'cus_72109',
      customer_email: 'rohit.verma@example.com',
      customer_name: 'Rohit Verma',
      customer_phone: '+91 98111 22334',
      total_amount: 2499.00,
      currency: 'INR',
      status: 'PROCESSING',
      payment_status: 'PAID',
      fulfillment_status: 'UNFULFILLED',
      shipping_address: 'B-14 Sector 62, Noida, Uttar Pradesh 201301',
      tracking_number: 'TRK-DELHIVERY-72109',
      carrier: 'Delhivery Surface',
      items: [
        {
          product_id: 'prod_stealth_pants',
          title: 'Stealth Cargo Reflex Joggers',
          quantity: 1,
          price: 2499.00
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 10).toISOString()
    },
    {
      id: 'ord_sample_61045',
      workspace_id: workspaceId,
      order_number: '#ORD-61045',
      customer_id: 'cus_61045',
      customer_email: 'ananya.iyer@example.com',
      customer_name: 'Ananya Iyer',
      customer_phone: '+91 97400 99887',
      total_amount: 8998.00,
      currency: 'INR',
      status: 'PAID',
      payment_status: 'PAID',
      fulfillment_status: 'DELIVERED',
      shipping_address: '12th Cross, Indiranagar Stage 2, Bengaluru, KA 560038',
      tracking_number: 'TRK-EKART-61045',
      carrier: 'Ekart Logistics',
      items: [
        {
          product_id: 'prod_modular_pack',
          title: 'Modular Fidlock Urban Sling Bag',
          quantity: 2,
          price: 4499.00
        }
      ],
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  for (const ord of sampleOrders) {
    await db.commerceOrders.create(workspaceId, ord);
    console.log(`Created order: ${ord.order_number}`);
  }

  console.log('Done seeding initial orders.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
