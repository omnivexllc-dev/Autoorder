import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.json');

console.log(`[Database] Initializing JSON database at: ${dbPath}`);

export interface OrderRow {
  id: number;
  customer_name: string;
  phone_number: string;
  order_number: string;
  product_name: string;
  price: string;
  status: string;
  call_sid: string | null;
  call_duration: number | null;
  attempts: number;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

interface DatabaseSchema {
  settings: Record<string, string>;
  orders: OrderRow[];
  nextOrderId: number;
}

let dbData: DatabaseSchema = {
  settings: {},
  orders: [],
  nextOrderId: 1,
};

// Queue for disk writes to prevent parallel write clobbering
let writePromise: Promise<void> = Promise.resolve();

async function saveToDisk(): Promise<void> {
  writePromise = writePromise.then(async () => {
    try {
      const tempPath = `${dbPath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(dbData, null, 2), 'utf-8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error('[Database] Error saving database to disk:', err);
    }
  });
  return writePromise;
}

// Legacy SQLite helpers for compatibility (unused)
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return Promise.resolve({ lastID: 0, changes: 0 });
}

export function dbGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return Promise.resolve(undefined);
}

export function dbAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  return Promise.resolve([]);
}

// Initialize tables
export async function initDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const content = await fs.promises.readFile(dbPath, 'utf-8');
      dbData = JSON.parse(content);
      // Ensure defaults exist
      if (!dbData.settings) dbData.settings = {};
      if (!dbData.orders) dbData.orders = [];
      if (typeof dbData.nextOrderId !== 'number') {
        dbData.nextOrderId = dbData.orders.reduce((max, o) => Math.max(max, o.id), 0) + 1;
      }
    } else {
      dbData = {
        settings: {
          admin_password: 'admin123',
          twilio_account_sid: '',
          twilio_auth_token: '',
          twilio_phone_number: '',
        },
        orders: [],
        nextOrderId: 1,
      };
      await saveToDisk();
      console.log('[Database] Initialized new JSON database.');
    }

    // Seed default settings if they don't exist
    let dirty = false;
    if (!dbData.settings.admin_password) {
      dbData.settings.admin_password = 'admin123';
      dirty = true;
      console.log('[Database] Seeded default admin password (admin123)');
    }
    if (dbData.settings.twilio_account_sid === undefined) {
      dbData.settings.twilio_account_sid = '';
      dirty = true;
    }
    if (dbData.settings.twilio_auth_token === undefined) {
      dbData.settings.twilio_auth_token = '';
      dirty = true;
    }
    if (dbData.settings.twilio_phone_number === undefined) {
      dbData.settings.twilio_phone_number = '';
      dirty = true;
    }

    if (dirty) {
      await saveToDisk();
    }

    console.log('[Database] JSON database schema initialized successfully.');
  } catch (err) {
    console.error('[Database] Error initializing database schema:', err);
  }
}

// Database helper operations
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  return dbData.settings[key] !== undefined ? dbData.settings[key] : defaultValue;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  dbData.settings[key] = value;
  await saveToDisk();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return { ...dbData.settings };
}

export async function getAllOrders(): Promise<OrderRow[]> {
  return [...dbData.orders].sort((a, b) => b.id - a.id);
}

export async function getOrderById(id: number): Promise<OrderRow | undefined> {
  return dbData.orders.find((o) => o.id === id);
}

export async function getOrderByCallSid(callSid: string): Promise<OrderRow | undefined> {
  return dbData.orders.find((o) => o.call_sid === callSid);
}

export async function addOrder(order: {
  customer_name: string;
  phone_number: string;
  order_number: string;
  product_name: string;
  price: string;
}): Promise<number> {
  const newOrder: OrderRow = {
    id: dbData.nextOrderId++,
    customer_name: order.customer_name,
    phone_number: order.phone_number,
    order_number: order.order_number,
    product_name: order.product_name,
    price: order.price,
    status: 'Pending',
    call_sid: null,
    call_duration: null,
    attempts: 0,
    created_at: new Date().toISOString(),
    called_at: null,
    completed_at: null,
  };
  dbData.orders.push(newOrder);
  await saveToDisk();
  return newOrder.id;
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  const order = dbData.orders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    await saveToDisk();
  }
}

export async function updateOrderCallDetails(
  id: number,
  details: {
    status?: string;
    call_sid?: string | null;
    call_duration?: number | null;
    called_at?: string | null;
    completed_at?: string | null;
    attempts?: number;
  }
): Promise<void> {
  const order = dbData.orders.find((o) => o.id === id);
  if (order) {
    if (details.status !== undefined) order.status = details.status;
    if (details.call_sid !== undefined) order.call_sid = details.call_sid;
    if (details.call_duration !== undefined) order.call_duration = details.call_duration;
    if (details.called_at !== undefined) order.called_at = details.called_at;
    if (details.completed_at !== undefined) order.completed_at = details.completed_at;
    if (details.attempts !== undefined) order.attempts = details.attempts;
    await saveToDisk();
  }
}

export async function updateOrderCallDetailsBySid(
  callSid: string,
  details: {
    status?: string;
    call_duration?: number | null;
    completed_at?: string | null;
  }
): Promise<void> {
  const order = dbData.orders.find((o) => o.call_sid === callSid);
  if (order) {
    if (details.status !== undefined) order.status = details.status;
    if (details.call_duration !== undefined) order.call_duration = details.call_duration;
    if (details.completed_at !== undefined) order.completed_at = details.completed_at;
    await saveToDisk();
  }
}

export async function incrementOrderAttempts(id: number): Promise<number> {
  const order = dbData.orders.find((o) => o.id === id);
  if (order) {
    order.attempts += 1;
    await saveToDisk();
    return order.attempts;
  }
  return 0;
}

export async function clearAllOrders(): Promise<void> {
  dbData.orders = [];
  await saveToDisk();
}
