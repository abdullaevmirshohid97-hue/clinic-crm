const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getDatabase, getDbPath } = require('./database');
const os = require('os');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';


let currentUserId = 0;
function setCurrentUserId(id) { currentUserId = id; }
function getCurrentUserId() { return currentUserId; }
function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        const family = net.family || '';
        if (family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch { }
  return '';
}

const QR_UPLOAD_DIR = path.join(__dirname, '../public/qr');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

let mainWindow;
// Simple in-memory role map for ACL demo
const USER_ROLES = {
  0: 'guest',
  1: 'admin',
  2: 'staff',
  3: 'viewer'
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Clinic CRM',
    icon: path.join(__dirname, '../public/icon.png'),
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev or production
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5200');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  initDatabase();

  // Create window
  createWindow();

  // ===== IPC HANDLERS =====

  function sanitize(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      return out;
    }
    return obj;
  }

  // Generic DB query
  ipcMain.handle('db:run', (event, sql, params) => {
    const db = getDatabase();
    try {
      const stmt = db.prepare(sql);
      if (sql.trimStart().toUpperCase().startsWith('SELECT') ||
          sql.trimStart().toUpperCase().startsWith('PRAGMA')) {
        const rows = stmt.all(...(params || []));
        return { success: true, data: sanitize(rows) };
      } else {
        const result = stmt.run(...(params || []));
        return { success: true, data: { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) } };
      }
    } catch (err) {
      console.error('DB Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Get all from table
  ipcMain.handle('db:getAll', (event, table) => {
    const db = getDatabase();
    try {
      const allowedTables = ['patients', 'doctors', 'services', 'appointments', 'queue', 'rooms', 'room_patients', 'transactions', 'audit_log', 'settings', 'shifts', 'inpatient', 'doctor_payouts', 'promotions', 'dashboard_notes', 'expenses', 'inpatient_treatments', 'permissions', 'laboratory_tests', 'laboratory_templates', 'inventory', 'inventory_transactions', 'consumables_mapping', 'staff', 'attendance', 'marketing_campaigns'];
      if (!allowedTables.includes(table)) {
        return { success: false, error: 'Invalid table name' };
      }
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
      return { success: true, data: sanitize(rows) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Insert into table
  ipcMain.handle('db:insert', (event, table, data) => {
    const db = getDatabase();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const result = db.prepare(sql).run(...values);
      return { success: true, data: { id: Number(result.lastInsertRowid), ...data } };
    } catch (err) {
      console.error('DB Insert Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Update record
  ipcMain.handle('db:update', (event, table, id, data) => {
    const db = getDatabase();
    try {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
      db.prepare(sql).run(...Object.values(data), id);
      return { success: true };
    } catch (err) {
      console.error('DB Update Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Delete record
  ipcMain.handle('db:delete', (event, table, id) => {
    const db = getDatabase();
    try {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      return { success: true };
    } catch (err) {
      console.error('DB Delete Error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // ===== PRINT HANDLERS =====
  ipcMain.handle('print:receipt', async (event, htmlContent, options = {}) => {
    try {
      const printWin = new BrowserWindow({
        show: false,
        width: options.width || 300,
        height: options.height || 600,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      const printOptions = {
        silent: options.silent !== false,
        printBackground: true,
        margins: { marginType: 'none' },
      };
      if (options.printerName) {
        printOptions.deviceName = options.printerName;
      }
      await printWin.webContents.print(printOptions);
      printWin.close();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('print:getPrinters', async () => {
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return { success: true, data: printers };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ===== JOURNAL HANDLER =====
  ipcMain.handle('journal:log', (event, entry) => {
    try {
      const dbInstance = getDatabase();
      const userId = entry?.user_id ?? currentUserId ?? 0;
      // ACL: allow only admin or staff to write journal entries
      const role = USER_ROLES[userId] || 'guest';
      if (!(['admin','staff'].includes(role))) {
        return { success: false, error: 'Not authorized to log journal' };
      }
      const sql = 'INSERT INTO journal_entries (created_at, user_id, action, table_name, record_id, amount, category, description, host, ip, device) VALUES (datetime("now","localtime"), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      const host = entry?.host ?? os.hostname();
      const ip = entry?.ip ?? getLocalIp();
      const device = entry?.device ?? `${os.type()} ${os.arch()}`;
      // fetch role for ACL (role already resolved above)
      const res = dbInstance.prepare("INSERT INTO journal_entries (created_at, user_id, action, table_name, record_id, amount, category, description, host, ip, device, role) VALUES (datetime(\"now\",\"localtime\"), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(userId, entry?.action, entry?.table_name, entry?.record_id ?? null, entry?.amount ?? 0, entry?.category ?? '', entry?.description ?? '', host, ip, device, role);
      const newEntry = {
        id: Number(res.lastInsertRowid),
        created_at: new Date().toISOString(),
        user_id: userId,
        action: entry?.action,
        table_name: entry?.table_name,
        record_id: entry?.record_id ?? null,
        amount: entry?.amount ?? 0,
        category: entry?.category ?? '',
        description: entry?.description ?? '',
        host,
        ip,
        device,
        role: role
      };
      try { mainWindow?.webContents?.send('journal:update', newEntry); } catch {}
      return { success: true, id: Number(res.lastInsertRowid) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ===== JOURNAL GET ALL HANDLER (LEGACY/GENERIC) =====
  ipcMain.handle('journal:getAll', (event, filters) => {
    try {
      const db = getDatabase();
      const from = filters?.from ? String(filters.from) : null;
      const to = filters?.to ? String(filters.to) : null;
      const user_id = filters?.user_id ?? null;
      const act = filters?.action ?? null;
      const tbl = filters?.table_name ?? null;
      const search = filters?.search ?? null;
      const page = Number(filters?.page) >= 0 ? Number(filters.page) : 0;
      const pageSize = Number(filters?.pageSize) > 0 ? Number(filters.pageSize) : 10;

      let whereClauses = [];
      let params = [];
      if (from) { whereClauses.push('date(created_at) >= date(?)'); params.push(from); }
      if (to) { whereClauses.push('date(created_at) <= date(?)'); params.push(to); }
      if (user_id != null) { whereClauses.push('user_id = ?'); params.push(user_id); }
      if (act) { whereClauses.push('action = ?'); params.push(act); }
      if (tbl) { whereClauses.push('table_name = ?'); params.push(tbl); }
      if (search) {
        const like = '%' + search + '%';
        whereClauses.push('(CAST(id AS TEXT) LIKE ? OR description LIKE ? OR host LIKE ? OR ip LIKE ? OR device LIKE ? OR action LIKE ? OR table_name LIKE ? OR record_id LIKE ?)');
        params.push(like, like, like, like, like, like, like, like);
      }
      const where = whereClauses.length ? (' WHERE ' + whereClauses.join(' AND ')) : '';
      const dataSql = `SELECT * FROM journal_entries${where} ORDER BY id DESC LIMIT ? OFFSET ?`;
      const dataParams = [...params, pageSize, page * pageSize];
      const rows = db.prepare(dataSql).all(...dataParams);

      // total
      const countSql = `SELECT COUNT(*) as total FROM journal_entries${where}`;
      const total = db.prepare(countSql).get(...params).total;

      return { success: true, data: rows, total };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ===== COMPREHENSIVE JOURNAL HANDLER =====
  ipcMain.handle('journal:getComprehensive', (event, filters) => {
    try {
      const db = getDatabase();
      const from = filters?.from ? String(filters.from) : null;
      const to = filters?.to ? String(filters.to) : null;
      const search = filters?.search ? `%${filters.search}%` : null;

      let whereA = ['1=1'];
      let whereRP = ['1=1'];
      let params = [];

      if (from) {
        whereA.push('date(a.createdAt) >= date(?)');
        whereRP.push('date(rp.entryDate) >= date(?)');
        params.push(from); 
      }
      if (to) {
        whereA.push('date(a.createdAt) <= date(?)');
        whereRP.push('date(rp.entryDate) <= date(?)');
        params.push(to);
      }

      // We need five sets of date params because there are 5 parts of UNION
      let unionParams = [];
      for (let i = 0; i < 5; i++) {
        if (from) unionParams.push(from);
        if (to) unionParams.push(to);
      }
      if (search) unionParams.push(search, search, search);

      const sql = `
        SELECT * FROM (
          SELECT 
            a.id, 
            'outpatient' as type, 
            a.createdAt as date, 
            p.fullName as patient_name, 
            p.phone as patient_phone, 
            d.fullName as doctor_name, 
            d.commission_rate,
            s.name as item_name,
            s.category as category,
            (a.amount * COALESCE(a.quantity, 1)) as amount,
            a.paymentType as payment_type,
            a.status,
            NULL as room_name,
            a.patientId,
            a.doctorId,
            COALESCE(a.discount, 0) as discount,
            COALESCE(a.createdBy, 'Noma''lum') as created_by,
            COALESCE(a.commissionPaid, 0) as commission_paid
          FROM appointments a
          JOIN patients p ON a.patientId = p.id
          JOIN doctors d ON a.doctorId = d.id
          JOIN services s ON a.serviceId = s.id
          WHERE ${whereA.join(' AND ')}
          
          UNION ALL
          
          SELECT 
            rp.id, 
            'inpatient' as type, 
            rp.entryDate as date, 
            p.fullName as patient_name, 
            p.phone as patient_phone, 
            d.fullName as doctor_name, 
            d.commission_rate,
            r.name as item_name,
            r.department as category,
            COALESCE(rp.totalCost, (rp.days * r.pricePerDay)) as amount,
            'statsionar' as payment_type,
            rp.status,
            r.name as room_name,
            rp.patientId,
            rp.doctorId,
            0 as discount,
            COALESCE(rp.createdBy, 'Noma''lum') as created_by,
            COALESCE(rp.commissionPaid, 0) as commission_paid
          FROM room_patients rp
          JOIN patients p ON rp.patientId = p.id
          JOIN doctors d ON rp.doctorId = d.id
          JOIN rooms r ON rp.roomId = r.id
          WHERE ${whereRP.join(' AND ')}
          
          UNION ALL
          
          SELECT 
            e.id, 
            'expense' as type, 
            e.expenseDate as date, 
            '' as patient_name, 
            '' as patient_phone, 
            '' as doctor_name, 
            0 as commission_rate,
            e.description as item_name,
            e.category as category,
            e.amount,
            'Chiqim' as payment_type,
            'completed' as status,
            '' as room_name,
            NULL as patientId,
            NULL as doctorId,
            0 as discount,
            'Tizim' as created_by,
            0 as commission_paid
          FROM expenses e
          WHERE ${whereA.join(' AND ').replace(/a\.createdAt/g, 'e.expenseDate')}
          
          UNION ALL
          
          SELECT 
            dp.id, 
            'payout' as type, 
            dp.created_at as date, 
            '' as patient_name, 
            '' as patient_phone, 
            d.fullName as doctor_name, 
            dp.percentage as commission_rate,
            dp.note as item_name,
            'Ulush to''lovi' as category,
            dp.amount,
            'Chiqim' as payment_type,
            'completed' as status,
            '' as room_name,
            NULL as patientId,
            dp.doctor_id as doctorId,
            0 as discount,
            'Tizim' as created_by,
            0 as commission_paid
          FROM doctor_payouts dp
          LEFT JOIN doctors d ON dp.doctor_id = d.id
          WHERE ${whereA.join(' AND ').replace(/a\.createdAt/g, 'dp.created_at')}
          
          UNION ALL
          
          SELECT 
            q.id, 
            'queue_completed' as type, 
            q.createdAt as date, 
            p.fullName as patient_name, 
            p.phone as patient_phone, 
            d.fullName as doctor_name, 
            0 as commission_rate,
            'Navbat: ' || q.prefix || '-' || q.number as item_name,
            'Qabul' as category,
            0 as amount,
            '' as payment_type,
            q.status as status,
            '' as room_name,
            q.patientId,
            q.doctorId,
            0 as discount,
            'Tizim' as created_by,
            0 as commission_paid
          FROM queue q
          LEFT JOIN patients p ON q.patientId = p.id
          LEFT JOIN doctors d ON q.doctorId = d.id
          WHERE q.status = 'completed' AND q.appointmentId IS NULL AND ${whereA.join(' AND ').replace(/a\.createdAt/g, 'q.createdAt')}
        ) 
        ${search ? ' WHERE (patient_name LIKE ? OR doctor_name LIKE ? OR item_name LIKE ?)' : ''}
        ORDER BY date DESC
      `;

      const rows = db.prepare(sql).all(...unionParams);
      return { success: true, data: sanitize(rows) };
    } catch (e) { 
      console.error('Comprehensive Journal Error:', e.message);
      return { success:false, error: e.message }; 
    }
  });

  // ===== FINANCIAL STATS HANDLER =====
  ipcMain.handle('journal:getFinancialStats', (event) => {
    try {
      const db = getDatabase();
      const today = new Date().toISOString().split('T')[0];
      
      const queryStats = (condition, params = []) => {
        // Appt Revenue/Debt
        const sql = `
          SELECT 
            COALESCE(SUM(CASE WHEN paymentType != 'debt' AND paymentType != 'Chiqim' THEN (amount * COALESCE(quantity, 1)) ELSE 0 END), 0) as revenue,
            COALESCE(SUM(CASE WHEN paymentType = 'debt' THEN (amount * COALESCE(quantity, 1)) ELSE 0 END), 0) as debt
          FROM appointments
          WHERE ${condition} AND (status != 'refunded' AND status != 'cancelled')
        `;
        const res = db.prepare(sql).get(...params);

        // Inpatient Revenue
        const sqlRP = `
          SELECT COALESCE(SUM(totalCost), 0) as revenue
          FROM room_patients
          WHERE status = 'discharged' AND ${condition.replace('createdAt', 'exitDate')}
        `;
        const resRP = db.prepare(sqlRP).get(...params);

        // Expenses
        const sqlExp = `
          SELECT COALESCE(SUM(amount), 0) as total
          FROM expenses
          WHERE ${condition.replace('createdAt', 'expenseDate')}
        `;
        const resExp = db.prepare(sqlExp).get(...params);

        // Recovered Debt: Appointments marked as 'paid' today that were created before today
        const sqlRec = `
          SELECT COALESCE(SUM(amount * COALESCE(quantity, 1)), 0) as total
          FROM appointments
          WHERE paymentType != 'debt' AND status = 'paid' 
          AND date(createdAt) < date(?)
        `;
        const resRec = db.prepare(sqlRec).get(today);

        return { 
          revenue: Number(res.revenue) + Number(resRP.revenue),
          debt: Number(res.debt),
          expense: Number(resExp.total),
          recovered: Number(resRec.total)
        };
      };

      const daily = queryStats("date(createdAt) = date(?)", [today]);
      // Weekly/monthly recovered debt can be complex, for now we keep daily accurate
      const weekly = queryStats("date(createdAt) >= date(?, 'weekday 1', '-7 days')", [today]);
      const monthly = queryStats("strftime('%Y-%m', createdAt) = strftime('%Y-%m', ?)", [today]);

      return { success: true, daily, weekly, monthly };
    } catch (e) {
      console.error('Financial Stats Error:', e.message);
      return { success: false, error: e.message };
    }
  });

  // ===== DEBT PAYMENT HANDLER =====
  ipcMain.handle('journal:payDebt', (event, type, id, paymentType, amount) => {
    try {
      const db = getDatabase();
      const table = type === 'outpatient' ? 'appointments' : 'room_patients';
      const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      if (!record) return { success: false, error: 'Topilmadi' };

      // Update record to paid
      db.prepare(`UPDATE ${table} SET paymentType = ?, status = 'paid' WHERE id = ?`).run(paymentType, id);
      
      // Log audit
      db.prepare('INSERT INTO audit_log (userId, action, tableName, recordId, oldData, newData, userName, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(0, 'pay_debt', table, id, JSON.stringify(record), JSON.stringify({...record, paymentType, status:'paid'}), 'Kassir', 'Qarz yopildi');

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ===== EXPENSE HANDLER =====
  ipcMain.handle('journal:addExpense', (event, category, amount, description) => {
    try {
      const db = getDatabase();
      const res = db.prepare('INSERT INTO expenses (category, amount, description) VALUES (?, ?, ?)')
        .run(category, Number(amount), description);
      return { success: true, id: Number(res.lastInsertRowid) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // ACL: get user role
  ipcMain.handle('auth:getUserRole', (event, userId) => {
    try {
      const dbInstance = getDatabase();
      const r = dbInstance.prepare('SELECT role FROM roles WHERE user_id = ?').get(userId);
      return r?.role ?? 'guest';
    } catch (e) { return 'guest'; }
  });
  // ACL: set user role
  ipcMain.handle('auth:setUserRole', (event, userId, role) => {
    try {
      const dbInstance = getDatabase();
      dbInstance.prepare('INSERT OR REPLACE INTO roles (user_id, role) VALUES (?, ?)').run(userId, String(role));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ===== AUDIT TRAIL HANDLER =====
  ipcMain.handle('journal:getAuditTrail', (event, tableName, recordId) => {
    try {
      const db = getDatabase();
      const rows = db.prepare(
        'SELECT * FROM audit_log WHERE tableName = ? AND recordId = ? ORDER BY createdAt DESC'
      ).all(String(tableName), Number(recordId));
      return { success: true, data: sanitize(rows) };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ===== REFUND HANDLER =====
  ipcMain.handle('journal:refund', (event, tableName, recordId, userName, reason) => {
    try {
      const db = getDatabase();
      const old = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(Number(recordId));
      if (!old) return { success: false, error: 'Yozuv topilmadi' };
      db.prepare(`UPDATE ${tableName} SET status = 'refunded' WHERE id = ?`).run(Number(recordId));
      db.prepare(
        'INSERT INTO audit_log (userId, action, tableName, recordId, oldData, newData, userName, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(0, 'refund', String(tableName), Number(recordId), JSON.stringify(old), JSON.stringify({...old, status:'refunded'}), String(userName || 'Noma\'lum'), String(reason || 'Qaytarildi'));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // ===== CANCEL HANDLER =====
  ipcMain.handle('journal:cancel', (event, tableName, recordId, userName, reason) => {
    try {
      const db = getDatabase();
      const old = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(Number(recordId));
      if (!old) return { success: false, error: 'Yozuv topilmadi' };
      db.prepare(`UPDATE ${tableName} SET status = 'cancelled' WHERE id = ?`).run(Number(recordId));
      db.prepare(
        'INSERT INTO audit_log (userId, action, tableName, recordId, oldData, newData, userName, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(0, 'cancel', String(tableName), Number(recordId), JSON.stringify(old), JSON.stringify({...old, status:'cancelled'}), String(userName || 'Noma\'lum'), String(reason || 'Bekor qilindi'));
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  });

  // Broadcast new journal entry to renderers

  // (duplicate journal:getAll removed)

  // ===== AUTH HANDLERS =====
  ipcMain.handle('auth:getCurrentUser', () => {
    return currentUserId;
  });
  ipcMain.handle('auth:setCurrentUser', (event, id) => {
    currentUserId = id;
    return { success: true };
  });

  // ===== BACKUP HANDLER =====
  ipcMain.handle('backup:export', async () => {
    try {
      const dbPath = getDbPath();
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Backup',
        defaultPath: `clinic_backup_${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'SQLite DB', extensions: ['db'] }],
      });
      if (result.canceled) return { success: false, error: 'Cancelled' };
      fs.copyFileSync(dbPath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Backup',
        filters: [{ name: 'SQLite DB', extensions: ['db'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return { success: false, error: 'Cancelled' };
      const dbPath = getDbPath();
      const currentDb = getDatabase();
      if (currentDb) currentDb.close();
      fs.copyFileSync(result.filePaths[0], dbPath);
      initDatabase();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ===== QR UPLOAD HANDLER =====
  ipcMain.handle('qr:upload', async (event, base64Data, fileName) => {
    try {
      if (!base64Data || !fileName) {
        return { success: false, error: 'Ma\'lumot topilmadi' };
      }

      const ext = path.extname(fileName).toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg') {
        return { success: false, error: 'Faqat JPEG fayllar qabul qilinadi (.jpg, .jpeg)' };
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > MAX_FILE_SIZE) {
        return { success: false, error: 'Fayl hajmi 2MB dan oshmasligi kerak' };
      }

      if (!fs.existsSync(QR_UPLOAD_DIR)) {
        fs.mkdirSync(QR_UPLOAD_DIR, { recursive: true });
      }

      const safeName = `qr_${Date.now()}${ext}`;
      const filePath = path.join(QR_UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buffer);

      const relativePath = `/qr/${safeName}`;

      const db = getDatabase();
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('printerQrPath', relativePath);

      return { success: true, path: relativePath };
    } catch (err) {
      console.error('QR Upload Error:', err.message);
      return { success: false, error: err.message };
    }
  });

// ===== TELEGRAM TEST HANDLER =====
  ipcMain.handle('backup:testTelegram', async (event, token, chatId) => {
    try {
      const dbPath = getDbPath();
      await sendToTelegram(token, chatId, dbPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ===== AUTO BACKUP & TELEGRAM SYNC =====
const https = require('https');

function sendToTelegram(botToken, chatId, filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = path.basename(filePath);
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
      const fileExt = path.extname(filePath).slice(1);
      
      let postDataStart = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="chat_id"\r\n\r\n` +
        `${chatId}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n` +
        `Content-Type: application/${fileExt}\r\n\r\n`
      );
      
      let postDataEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
      const fileData = fs.readFileSync(filePath);
      const payloadLength = postDataStart.length + fileData.length + postDataEnd.length;

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendDocument`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': payloadLength
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve(body);
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postDataStart);
      req.write(fileData);
      req.write(postDataEnd);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ===== LABORATORY MACHINE INTEGRATION (HL7 / JSON) =====
// External Analyzers Mock Hook Endpoint. A background Node service would send machine data here.
ipcMain.handle('laboratory:receiveHL7', async (event, data) => {
  try {
    console.log("HL7 / Analyzer Data Received:", data);
    // Insert into db or notify frontend
    return { success: true, processed: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function autoBackup() {
  try {
    const dbInstance = getDatabase();
    if (!dbInstance) return;

    const settings = dbInstance.prepare("SELECT key, value FROM settings").all();
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });

    let backupTime = config.backupTime || '23:00';
    let lastBackupDate = config.lastBackupDate || '';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHourMin = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Force backup if time matches and we haven't backed up today
    const timeMatch = currentHourMin >= backupTime;
    
    if (timeMatch && lastBackupDate !== today) {
      const dbPath = getDbPath();
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const backupPath = path.join(backupDir, `clinic_auto_${today}.db`);
      fs.copyFileSync(dbPath, backupPath);
      console.log('Automated scheduled backup created:', backupPath);

      dbInstance.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('lastBackupDate', ?)").run(today);

      // Clean old
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('clinic_auto_')).sort().reverse();
      files.slice(7).forEach(f => {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch(e){}
      });

      // Telegram Sync
      if (config.telegramBotToken && config.telegramChatId) {
        console.log('Attempting Telegram Sync...');
        sendToTelegram(config.telegramBotToken, config.telegramChatId, backupPath)
          .then(res => console.log('Telegram sync response:', res))
          .catch(err => console.error('Telegram sync error:', err));
      }
    }
  } catch (err) {
    console.error('Auto backup failed:', err.message);
  }
}

// Check every 5 minutes
setInterval(autoBackup, 5 * 60 * 1000);

// ===== GLOBAL ERROR HANDLING =====
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
