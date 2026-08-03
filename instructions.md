Project Instructions: FixMaster POS & Repair Management System
1. Project Overview
FixMaster is a complete Point of Sale (POS) and Repair Management System built specifically for multi-category repair shops. The application manages inventory, vendor purchases, repair job cards, labor charges, billing/invoicing, sales history, and business analytics.

It is designed as a zero-backend Single Page Application (SPA) with browser localStorage and optional Firebase Realtime Database live cloud synchronization between Mobile Phones and PC Desktop instances.

2. Tech Stack & Architecture
Frontend Structure: HTML5 (SPA Layout with dynamic views).
Styling & Components: Tailwind CSS (via CDN) + DaisyUI (via CDN) + FontAwesome 6 (Icons).
Core Logic: Vanilla JavaScript (ES6+).
Local Data Engine: Browser localStorage (Offline-first data persistence).
Cloud Sync Engine: Google Firebase Realtime Database (Live mobile-to-PC data sync).
Desktop Application: Electron Framework (Compiles to standalone Windows FixMasterPOS.exe).
Mobile Application: Progressive Web App (PWA) with manifest.json and sw.js Service Worker for 1-click native Android installation.
3. Business Logic & Supported Equipment Categories
The system supports repairs for a wide variety of equipment and machinery, including:

Chainsaws
Brush Cutters
Petrol / Diesel Water Pumps
Air Compressors
High-Pressure Washers
Rice Cookers
Gas Cookers
Blenders
Electric Fans
Steam Irons
Drilling Machines
Cutting Machines / Angle Grinders
General / Multi-use Equipment
Pricing & Profit Margin Engine:
Spare Parts purchase cost is recorded as Cost Price.
Profit Margin % is configured (Default: 30%).
Retail Price is automatically computed: Retail Price = Cost Price + (Cost Price * Margin %).
Stock quantities are tracked automatically: adding spare parts to a Job Card deducts inventory stock; removing parts restores stock.
4. Core System Modules
4.1 Dashboard
Metrics Widgets: Today's Revenue, Monthly Revenue, Pending Repairs count, Low Stock alerts count.
Active Jobs Table: Live overview of non-delivered repair jobs with status badges and quick "Manage" drawer buttons.
Low Stock Parts Alert Table: Highlights parts falling below their minimum stock threshold with a 1-click "Restock" modal button.
4.2 Inventory & Spare Parts Management
Catalog Fields: Part Name, Category, Vendor Name, Cost Price, Profit Margin (%), Retail Price (Auto-calculated), Stock Quantity, Min Stock Alert Threshold.
Actions: Add Part, Edit Part, Delete Part, Restock Part (+ Qty).
Filtering & Search: Search by part name/vendor, filter by equipment category, filter by stock status (In Stock, Low Stock, Out of Stock).
4.3 Repair Management (Job Cards)
Job Card Fields: Job # (e.g. JOB-1001), Customer Name, Phone Number, Machine Category, Brand/Model No, Reported Fault/Issue, Live Status (Pending, In Progress, Completed, Delivered).
Parts Assignment: Select spare parts from stock, specify quantity, auto-calculate part totals, automatically deduct stock from inventory.
Labor Charge: Input custom labor/service fee per job card.
Auto-Total Calculation: Grand Total = Total Parts Retail Price + Labor Charge.
Multi-Filter System:
Status Tabs with live count badges: All Jobs, Pending, In Progress, Completed, Paid / Delivered.
Status Select Dropdown.
Equipment Category Select Dropdown.
Search bar (by Job #, Customer Name, Phone, or Machine Model).
4.4 Point of Sale (POS) & Billing
Job Selection: Select ready/completed repair jobs for billing.
Itemized Billing Terminal: Itemized list of parts used + labor charge.
Financial Controls: Subtotal calculation, custom Discount amount, Net Payable calculation.
Payment Methods: Cash, Credit/Debit Card, Mobile Payment (EzCash/Koko), Bank Transfer.
Checkout: Marks job status as Delivered upon payment and generates a sales invoice.
4.5 Printable Invoices & Receipts
Layout: Professional A4 / Thermal receipt layout featuring Shop Name, Address, Contact, Invoice #, Date, Customer details, Itemized breakdown, Subtotal, Discount, Net Paid, and Signatures.
Print Styling: Styled with CSS @media print rules; invoking window.print() prints a clean receipt while hiding all web application chrome.
4.6 Sales History & Data Backup
Sales Records: History table of all paid invoices, filterable by date and customer, with a 1-click "Reprint" button.
Data Backup:
1-Click Export Data Backup (JSON): Downloads entire database to a .json backup file.
1-Click Import Data Backup (JSON): Restores data from a backup .json file.
Demo Data Seeder & Factory Reset: Pre-loads realistic sample parts and job cards for demonstration or wipes data on command.
4.7 Firebase Live Cloud Sync (Mobile ↔ PC)
Realtime Sync: Connects Mobile Phone and PC instances to Google Firebase Realtime Database.
Configuration Controls in Settings: Database URL, API Key, Project ID input fields with connection status banner.
Dual Storage Fallback: When online, changes broadcast live to Firebase; when offline, data is safely saved in local storage.
5. File Structure

pos/
├── index.html          # Main SPA Layout, Modals, Views & CDN scripts
├── app.js              # State Engine, Business Logic, LocalStorage & Firebase Sync
├── styles.css          # Custom Scrollbars, Transitions & @media print rules
├── manifest.json       # Web App Manifest for Native Android PWA Installation
├── sw.js               # Service Worker for Offline Caching
├── main.js             # Electron Main Process Desktop Window Configuration
├── package.json        # Node.js dependencies & Electron build scripts
├── instructions.md     # System Architecture & Detailed Instruction Manual
└── dist/
    └── FixMasterPOS-win32-x64/
        └── FixMasterPOS.exe  # Standalone Windows Desktop Executable Application
6. How to Deploy & Run
6.1 Running on Desktop (Windows Executable)
Navigate to dist/FixMasterPOS-win32-x64/.
Double click FixMasterPOS.exe to launch the standalone desktop application.
6.2 Running on Web Browser
Open index.html directly in any web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
6.3 Installing as Native Android Mobile App
Transfer index.html, app.js, styles.css, manifest.json, and sw.js to your Android device or host online (e.g. via Netlify).
Open in Android Google Chrome.
Tap the 3 Dots Menu (⋮) -> Tap "Install App" or "Add to Home Screen".
The FixMaster app icon will be installed on your Android home screen.
6.4 Connecting Mobile & PC Live Sync
Create a free Firebase project at console.firebase.google.com.
Create a Realtime Database and copy the Database URL, API Key, and Project ID.
In both your Mobile App and PC Desktop App, go to Settings → Cloud Live Sync (Firebase), paste the credentials, and click Connect Cloud Sync.