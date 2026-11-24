// Backfills ~2 weeks of realistic historical transactions into MySQL and
// Snowflake, so your Power BI report has something to chart before you start
// ringing in live orders. Safe to run once after creating the schemas.
//
//   node seed.js            -> 700 historical rows
//   node seed.js 2000       -> 2000 historical rows

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const mysqlDb = require('./db/mysql');
const snowflakeDb = require('./db/snowflake');

const STORES = [
  { store_location: 'Bandra West', city: 'Mumbai' },
  { store_location: 'Koramangala', city: 'Bengaluru' },
  { store_location: 'Connaught Place', city: 'New Delhi' },
  { store_location: 'Banjara Hills', city: 'Hyderabad' },
  { store_location: 'Koregaon Park', city: 'Pune' },
  { store_location: 'T Nagar', city: 'Chennai' },
];
const BARISTAS = ['Aditi Rao', 'Rohan Mehta', 'Ananya Iyer', 'Farhan Sheikh', 'Kavya Nair', 'Vikram Singh'];
const PRODUCTS = [
  { product_name: 'Masala Chai', category: 'Chai', unit_price: 60 },
  { product_name: 'Cutting Chai', category: 'Chai', unit_price: 35 },
  { product_name: 'Filter Kaapi', category: 'Coffee', unit_price: 90 },
  { product_name: 'Cold Coffee with Ice Cream', category: 'Coffee', unit_price: 150 },
  { product_name: 'Classic Cappuccino', category: 'Espresso', unit_price: 160 },
  { product_name: 'Iced Americano', category: 'Espresso', unit_price: 170 },
  { product_name: 'Vada Pav', category: 'Snacks', unit_price: 50 },
  { product_name: 'Masala Maggi', category: 'Snacks', unit_price: 90 },
  { product_name: 'Banana Chocolate Muffin', category: 'Bakery', unit_price: 110 },
  { product_name: 'Assam Loose Leaf Tea (250g)', category: 'Tea', unit_price: 280 },
  { product_name: 'Nightshift Steel Tumbler', category: 'Merch', unit_price: 350 },
];
const PAYMENT_METHODS = ['UPI', 'UPI', 'UPI', 'Card', 'Cash', 'Wallet'];
const ORDER_CHANNELS = ['Counter', 'Counter', 'Swiggy', 'Zomato', 'Mobile App'];
const STATUSES = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Refunded', 'Voided'];
const NAMES = ['Aarav', 'Isha', 'Kabir', 'Meera', 'Rohit', 'Simran', 'Arjun', 'Diya', 'Neha', null, null];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomTransactionTime(daysAgoMax) {
  const daysAgo = Math.random() * daysAgoMax;
  const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
  // Weight toward morning / afternoon coffee rushes
  const hourBuckets = [7, 8, 8, 9, 9, 12, 13, 15, 16, 17];
  d.setHours(pick(hourBuckets), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return d;
}

function buildRow() {
  const store = pick(STORES);
  const product = pick(PRODUCTS);
  const quantity = pick([1, 1, 1, 2, 2, 3]);
  const unit_price = product.unit_price;
  return {
    transaction_id: uuidv4(),
    store_location: store.store_location,
    city: store.city,
    barista_name: pick(BARISTAS),
    customer_name: pick(NAMES),
    product_name: product.product_name,
    category: product.category,
    quantity,
    unit_price,
    total_amount: Number((unit_price * quantity).toFixed(2)),
    payment_method: pick(PAYMENT_METHODS),
    order_channel: pick(ORDER_CHANNELS),
    status: pick(STATUSES),
    transaction_time: randomTransactionTime(14),
  };
}

async function run() {
  const count = Number(process.argv[2]) || 700;
  console.log(`Seeding ${count} historical transactions into MySQL + Snowflake...`);

  let ok = 0, failMysql = 0, failSnowflake = 0;
  for (let i = 0; i < count; i++) {
    const row = buildRow();
    try {
      await mysqlDb.insertTransaction(row);
    } catch (e) {
      failMysql++;
    }
    try {
      await snowflakeDb.insertTransaction(row);
    } catch (e) {
      failSnowflake++;
    }
    ok++;
    if (ok % 100 === 0) console.log(`  ...${ok}/${count}`);
  }

  console.log(`Done. ${ok} rows attempted. MySQL failures: ${failMysql}. Snowflake failures: ${failSnowflake}.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
