# OrderConfirm AI 📞

OrderConfirm AI is a modern, full-stack automated order verification application. It allows business administrators to upload customer order spreadsheets (.xlsx or .csv) and automatically place outbound phone calls using the Twilio Voice API. During the call, a personalized IVR plays and customers can confirm their order (press 1) or cancel/request support (press 2), with real-time dashboard status tracking.

---

## 🚀 Key Features

*   **🔒 Secure Admin Login**: Authorized panel with custom password configuration (default password is `admin123`).
*   **📊 Bento Statistics Cards**: Monitor total uploads, confirmed orders, cancelled requests, and failed connections.
*   **📁 Smart Drag-and-Drop Spreadsheet Parser**: Instantly parse `.xlsx` and `.csv` files using robust, fuzzy column matching headers.
*   **⚙️ Live Campaign Control Hub**: Start or pause call campaigns with automatic retry logic (calls are retried up to 2 times for "No Answer" or "Busy" states before marking them as complete).
*   **🎛️ Live Campaign Meter**: Tracks campaign completion status dynamically (e.g. "45 of 200 customers called").
*   **📑 Interactive Logs**: Highly detailed call logs showing customer info, retry counts, individual timestamps, and call durations.
*   **📥 CSV Exporting**: Export calling logs to a highly compatible, well-formatted CSV spreadsheet with a single click.
*   **🔧 Integrations Settings**: Easily modify Twilio Account SID, Auth Token, and caller phone number directly within the browser interface.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19) + Vite + Tailwind CSS (v4)
*   **Backend**: Node.js + Express
*   **Database**: SQLite (using the promisified `sqlite3` driver)
*   **Excel Engine**: `xlsx` (SheetsJS)
*   **Voice Client**: Twilio Voice API SDK

---

## 📋 Spreadsheet Import Layout

The Excel or CSV document should contain the following columns:

| Customer Name | Phone Number | Order Number | Product Name | price |
| :--- | :--- | :--- | :--- | :--- |
| Jane Doe | +15550199 | ORD-8812 | iPhone 14 Pro | $999.00 |
| John Smith | +15550214 | ORD-2342 | Leather Wallet | $45.00 |

*Note: The system features smart header mapping, allowing column names to be written with various casing or space patterns (e.g., `product_name`, `customer name`, `Total Price`, `price`).*

---

## 🗣️ IVR Script Structure

The outbound phone call plays a personalized message:

> "Hello **{{CustomerName}}**.  
> This is an automated order confirmation call from Sophoes.  
> We received your order.  
> Order Number: **{{OrderNumber}}**  
> Product: **{{ProductName}}**  
> Total Price: **{{Price}}**  
> If you would like to confirm your order, press 1.  
> To cancel your order and speak with our support team press 2.  
> Thank you for choosing PCSecure."

---

## 🔧 Installation & Local Setup

### Prerequisite
Ensure you have **Node.js (v18+)** installed.

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add the following parameters:
```env
APP_URL="http://localhost:3000"
GEMINI_API_KEY="YOUR_GEMINI_SECRET_KEY"
```

### 3. Run Development Server
```bash
npm run dev
```
This launches a unified Node/Express dev instance running on `http://localhost:3000` with hot-reloading for the frontend code.

### 4. Build & Production Deployment
To package the app for production, compile the React assets and bundle the backend using the production commands:
```bash
npm run build
npm start
```
This builds and serves the bundled production applet cleanly out of the `dist/` workspace.
