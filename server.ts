import express from 'express';
import path from 'path';
import multer from 'multer';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

// Initialize Database
import {
  initDatabase,
  getAllSettings,
  saveSetting,
  getAllOrders,
  getOrderById,
  addOrder,
  updateOrderCallDetails,
  updateOrderCallDetailsBySid,
  clearAllOrders,
  getSetting,
  resetAllOrders,
} from './server/db.js';

import { makeCall } from './server/twilio.js';

const app = express();
const PORT = 3000;

// Setup JSON and urlencoded body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file upload handling in memory
const upload = multer({ storage: multer.memoryStorage() });

// Global server variables
let isCallingStarted = false;
let isSimulatorMode = false;
let activeCalls = 0;
const MAX_CONCURRENT_CALLS = 1; // 1 concurrent call safe limit for typical Twilio trials/rates
let serverAppUrl = process.env.APP_URL || '';

// Token authentication middleware
const AUTH_TOKEN = 'secure_admin_token_orderconfirm_ai';

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }

  next();
}

// Ensure database is initialized
initDatabase();

// ==================== ADMIN AUTH ROUTES ====================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    const savedPassword = await getSetting('admin_password', 'admin123');

    if (password === savedPassword) {
      return res.json({ success: true, token: AUTH_TOKEN });
    } else {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const savedPassword = await getSetting('admin_password', 'admin123');

    if (currentPassword !== savedPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    await saveSetting('admin_password', newPassword.trim());
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS ROUTES ====================

app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await getAllSettings();
    // Exclude password from general settings payload for security
    const { admin_password, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = req.body;

    if (twilio_account_sid !== undefined) await saveSetting('twilio_account_sid', twilio_account_sid.trim());
    if (twilio_auth_token !== undefined) await saveSetting('twilio_auth_token', twilio_auth_token.trim());
    if (twilio_phone_number !== undefined) await saveSetting('twilio_phone_number', twilio_phone_number.trim());

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS ROUTES ====================

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Capture app url from request host as fallback
    if (!serverAppUrl) {
      serverAppUrl = `${req.protocol}://${req.get('host')}`;
    }

    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

    let importCount = 0;

    for (const row of jsonData) {
      // Robust fuzzy mapping for spreadsheet column headers
      const getVal = (possibleKeys: string[]) => {
        for (const key of Object.keys(row)) {
          const normalizedKey = key.trim().toLowerCase();
          if (possibleKeys.includes(normalizedKey)) {
            return String(row[key]).trim();
          }
        }
        return '';
      };

      const customerName = getVal(['customer name', 'customername', 'name', 'customer_name', 'customer']);
      const phoneNumber = getVal(['phone number', 'phonenumber', 'phone', 'phone_number', 'customer phone', 'phone_no']);
      const orderNumber = getVal(['order number', 'ordernumber', 'order', 'order_number', 'order_no']);
      const productName = getVal(['product name', 'productname', 'product', 'product_name', 'item', 'product_desc']);
      const price = getVal(['price', 'total', 'total price', 'total_price', 'amount', 'cost']);

      if (customerName && phoneNumber && orderNumber) {
        await addOrder({
          customer_name: customerName,
          phone_number: phoneNumber,
          order_number: orderNumber,
          product_name: productName || 'N/A',
          price: price || '0',
        });
        importCount++;
      }
    }

    res.json({ success: true, count: importCount, message: `Successfully imported ${importCount} orders.` });
  } catch (error: any) {
    console.error('[Upload Error]', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/clear', authenticateToken, async (req, res) => {
  try {
    await clearAllOrders();
    // Also stop calling if orders cleared
    isCallingStarted = false;
    res.json({ success: true, message: 'All orders and logs cleared.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { customer_name, phone_number, order_number, product_name, price } = req.body;
    if (!customer_name || !phone_number || !order_number) {
      return res.status(400).json({ error: 'Customer name, phone number, and order number are required.' });
    }

    const newId = await addOrder({
      customer_name: customer_name.trim(),
      phone_number: phone_number.trim(),
      order_number: order_number.trim(),
      product_name: (product_name || 'N/A').trim(),
      price: (price || '0').trim(),
    });

    res.json({ success: true, id: newId, message: 'Order added successfully to calling queue.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/reset', authenticateToken, async (req, res) => {
  try {
    await resetAllOrders();
    // Also stop active calling since we reset
    isCallingStarted = false;
    res.json({ success: true, message: 'All orders have been reset to Pending status.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CALLING SERVICE CONTROLS ====================

app.get('/api/calling/status', authenticateToken, async (req, res) => {
  res.json({ isCallingStarted, isSimulatorMode });
});

app.post('/api/calling/start', authenticateToken, async (req, res) => {
  try {
    // Capture dynamic host if not explicitly configured in env
    if (!serverAppUrl) {
      serverAppUrl = `${req.protocol}://${req.get('host')}`;
    }

    // Verify Twilio is configured
    const sid = await getSetting('twilio_account_sid');
    const token = await getSetting('twilio_auth_token');
    const phone = await getSetting('twilio_phone_number');

    if (!sid || !token || !phone) {
      isSimulatorMode = true;
      isCallingStarted = true;
      console.log(`[Worker] Twilio not configured. Auto-started campaign in SIMULATOR Mode.`);
      return res.json({
        success: true,
        isCallingStarted,
        isSimulatorMode,
        message: 'Sandbox Simulation Mode active (No Twilio credentials configured).'
      });
    }

    isSimulatorMode = false;
    isCallingStarted = true;
    console.log(`[Worker] Calling service started in LIVE Twilio mode. App URL: ${serverAppUrl}`);
    res.json({
      success: true,
      isCallingStarted,
      isSimulatorMode,
      message: 'Auto-calling service started in LIVE Twilio mode.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calling/stop', authenticateToken, async (req, res) => {
  isCallingStarted = false;
  console.log('[Worker] Calling service stopped manually.');
  res.json({ success: true, isCallingStarted, isSimulatorMode, message: 'Auto-calling service stopped.' });
});

// ==================== DASHBOARD STATS ====================

app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const orders = await getAllOrders();
    const stats = {
      totalOrders: orders.length,
      pending: orders.filter((o) => o.status === 'Pending').length,
      calling: orders.filter((o) => o.status === 'Calling').length,
      confirmed: orders.filter((o) => o.status === 'Confirmed').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      noAnswer: orders.filter((o) => o.status === 'No Answer').length,
      failed: orders.filter((o) => o.status === 'Failed').length,
      totalAttempts: orders.reduce((sum, o) => sum + (o.attempts || 0), 0),
      averageDuration: (() => {
        const withDuration = orders.filter((o) => o.call_duration !== null && o.call_duration > 0);
        if (withDuration.length === 0) return 0;
        const totalSecs = withDuration.reduce((sum, o) => sum + o.call_duration, 0);
        return Math.round(totalSecs / withDuration.length);
      })(),
    };
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TWILIO WEBHOOK ENDPOINTS ====================

// 1. Play TwiML IVR Script to user
app.post('/api/twilio/twiml/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const order = await getOrderById(orderId);

    if (!order) {
      console.error(`[Twilio Webhook] Order ID ${orderId} not found`);
      res.set('Content-Type', 'text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Error: Order not found.</Say></Response>`);
    }

    const appUrl = serverAppUrl || `${req.protocol}://${req.get('host')}`;
    const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

    console.log(`[Twilio Webhook] Rendering IVR TwiML for order ${order.order_number}`);

    // Exact TwiML XML incorporating the personalized IVR script from user request
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${cleanAppUrl}/api/twilio/gather/${orderId}" method="POST" timeout="8">
    <Say voice="alice">
      Hello ${order.customer_name}.
      This is an automated order confirmation call from Sophoes.
      We received your order.
      Order Number: ${order.order_number}.
      Product: ${order.product_name}.
      Total Price: ${order.price}.
      If you would like to confirm your order, press 1.
      To cancel your order and speak with our support team press 2.
      Thank you for choosing PCSecure.
    </Say>
  </Gather>
  <Say voice="alice">We did not receive any keypress. Thank you, goodbye.</Say>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('[TwiML Error]', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">System error occurred.</Say></Response>`);
  }
});

// 2. Handle Keypress Gather from IVR
app.post('/api/twilio/gather/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const digits = req.body.Digits;

    console.log(`[Twilio Webhook] Gather callback for order ID ${orderId}. Keypress: ${digits}`);

    let responseMessage = '';
    let finalStatus = '';

    if (digits === '1') {
      finalStatus = 'Confirmed';
      responseMessage = 'Thank you. Your order has been successfully confirmed. Goodbye.';
    } else if (digits === '2') {
      finalStatus = 'Cancelled';
      responseMessage = 'Your order cancellation has been received. Our support team will contact you shortly. Goodbye.';
    } else {
      finalStatus = 'Pending'; // Retry if invalid button pressed
      responseMessage = 'Invalid keypress option selected. Goodbye.';
    }

    if (finalStatus && finalStatus !== 'Pending') {
      await updateOrderCallDetails(orderId, {
        status: finalStatus,
        completed_at: new Date().toISOString(),
      });
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${responseMessage}</Say>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('[Gather Error]', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Error processing input.</Say></Response>`);
  }
});

// 3. Handle Status Callback (completed, busy, no-answer, failed)
app.post('/api/twilio/status-callback/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const callStatus = req.body.CallStatus;
    const duration = req.body.CallDuration ? parseInt(req.body.CallDuration) : 0;

    console.log(`[Twilio Webhook] Status Callback for order ${orderId}. Twilio Status: ${callStatus}, Duration: ${duration}s`);

    const order = await getOrderById(orderId);

    if (order) {
      let finalStatus = order.status;

      // Only adjust status if they didn't already lock in Confirmed/Cancelled in Gather
      if (order.status === 'Calling' || order.status === 'Pending') {
        if (callStatus === 'completed') {
          // If call completed but they didn't press 1 or 2, treat as no answer or retry
          if (order.attempts < 3) {
            finalStatus = 'Pending'; // Trigger automatic retry
          } else {
            finalStatus = 'No Answer';
          }
        } else if (['busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
          if (order.attempts < 3) {
            finalStatus = 'Pending'; // Trigger automatic retry
          } else {
            finalStatus = 'No Answer';
          }
        }
      }

      await updateOrderCallDetails(orderId, {
        status: finalStatus,
        call_duration: duration,
        completed_at: new Date().toISOString(),
      });
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error('[Status Callback Error]', error);
    res.sendStatus(500);
  }
});

// ==================== BACKGROUND QUEUE WORKER ====================

async function processCallingQueue() {
  if (!isCallingStarted) return;
  if (activeCalls >= MAX_CONCURRENT_CALLS) return;

  try {
    const orders = await getAllOrders();
    const pendingOrders = orders.filter((o) => o.status === 'Pending' && o.attempts < 3);

    if (pendingOrders.length === 0) {
      // Check if there are active ongoing calls
      const activeOngoing = orders.filter((o) => o.status === 'Calling');
      if (activeOngoing.length === 0) {
        isCallingStarted = false;
        console.log('[Worker] No more pending calls. Queue processing completed.');
      }
      return;
    }

    // Pick oldest pending order (at the end of our DESC id array)
    const nextOrder = pendingOrders[pendingOrders.length - 1];

    try {
      activeCalls++;
      const nextAttempts = (nextOrder.attempts || 0) + 1;

      // Update status to Calling to lock it
      await updateOrderCallDetails(nextOrder.id, {
        status: 'Calling',
        attempts: nextAttempts,
        called_at: new Date().toISOString(),
      });

      console.log(`[Worker] Outbound call to ${nextOrder.customer_name} (${nextOrder.phone_number}), attempt ${nextAttempts}`);

      if (isSimulatorMode) {
        // Run sandbox virtual call simulation
        const callSid = `mock_call_${Math.random().toString(36).substring(2, 10)}`;
        await updateOrderCallDetails(nextOrder.id, {
          call_sid: callSid,
        });

        console.log(`[Worker] [Simulator] Outbound call SID allocated: ${callSid}`);

        // Set a brief delay to simulate customer answering and pressing key
        setTimeout(async () => {
          try {
            // Verify calling is still active
            if (!isCallingStarted) return;

            const order = await getOrderById(nextOrder.id);
            if (!order || order.status !== 'Calling') return;

            const rand = Math.random();
            let finalStatus = 'Confirmed';
            let duration = Math.floor(Math.random() * 25) + 15; // 15-40 seconds call

            if (rand < 0.65) {
              finalStatus = 'Confirmed';
            } else if (rand < 0.82) {
              finalStatus = 'Cancelled';
              duration = Math.floor(Math.random() * 30) + 20;
            } else if (rand < 0.93) {
              finalStatus = nextAttempts < 3 ? 'Pending' : 'No Answer';
              duration = 0;
            } else {
              finalStatus = nextAttempts < 3 ? 'Pending' : 'Failed';
              duration = 0;
            }

            console.log(`[Worker] [Simulator] Customer ${order.customer_name} answered. Keypress results: ${finalStatus}`);

            await updateOrderCallDetails(nextOrder.id, {
              status: finalStatus,
              call_duration: finalStatus === 'Pending' ? null : duration,
              completed_at: new Date().toISOString(),
            });
          } catch (simErr: any) {
            console.error('[Worker] [Simulator] Callback error:', simErr.message);
          }
        }, 5000); // 5 seconds of speaking simulation
      } else {
        // Live mode: Twilio API
        const callSid = await makeCall({
          orderId: nextOrder.id,
          customerName: nextOrder.customer_name,
          phoneNumber: nextOrder.phone_number,
          appUrl: serverAppUrl,
        });

        await updateOrderCallDetails(nextOrder.id, {
          call_sid: callSid,
        });
      }
    } catch (callErr: any) {
      console.error(`[Worker] Error dialing order ID ${nextOrder.id}:`, callErr.message);

      // Handle Twilio call initiation error
      const curAttempts = (nextOrder.attempts || 0) + 1;
      await updateOrderCallDetails(nextOrder.id, {
        status: curAttempts < 3 ? 'Pending' : 'Failed',
        attempts: curAttempts,
      });
    } finally {
      activeCalls = Math.max(0, activeCalls - 1);
    }
  } catch (err: any) {
    console.error('[Worker] Fatal error in queue worker:', err.message);
  }
}

// Check and process calling queue every 4 seconds
setInterval(processCallingQueue, 4000);

// ==================== FRONTEND STATIC INTEGRATION & START ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OrderConfirm AI listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
