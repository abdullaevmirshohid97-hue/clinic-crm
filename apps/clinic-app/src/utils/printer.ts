import { db } from './db';

export async function getClinicSettings() {
  try {
    const rows = await db.query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
  } catch {
    return {};
  }
}

export function generateReceiptHTML(data, settings = {}) {
  const width = settings.receiptWidth || '80';
  const widthPx = width === '58' ? 220 : width === '110' ? 420 : 300;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: ${widthPx}px; padding: 8px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; }
  .total { font-size: 16px; font-weight: bold; margin: 4px 0; }
  h2 { font-size: 14px; margin-bottom: 2px; }
  .small { font-size: 10px; color: #666; }
</style></head><body>

<div class="center">
  <h2>${settings.clinicName || 'CLINIC CRM'}</h2>
  <div class="small">${settings.clinicAddress || ''}</div>
  <div class="small">${settings.clinicPhone || ''}</div>
  ${settings.clinicSlogan ? `<div class="small">${settings.clinicSlogan}</div>` : ''}
</div>

${settings.receiptHeader ? `<div class="center small" style="margin-top: 5px;">${settings.receiptHeader.replace(/\n/g, '<br/>')}</div>` : ''}

<div class="line"></div>

${data.type === 'queue' ? generateQueueReceipt(data) : data.type === 'payout' ? generatePayoutReceipt(data) : generateServiceReceipt(data)}

<div class="line"></div>
${settings.receiptFooter ? `<div class="center small" style="margin-bottom: 5px;">${settings.receiptFooter.replace(/\n/g, '<br/>')}</div><div class="line"></div>` : ''}

<div class="center small">${new Date().toLocaleString('uz-UZ')}</div>
<div class="center small">Rahmat! / Спасибо!</div>
${settings.receiptNote ? `<div class="center" style="font-size: 9px; color: #888; margin-top: 6px; font-style: italic;">${settings.receiptNote}</div>` : ''}

</body></html>`;
}

function generateQueueReceipt(data) {
  return `
<div class="center">
  <div class="small">NAVBAT CHEKI</div>
  <div style="font-size: 48px; font-weight: bold; margin: 8px 0;">${data.prefix}-${data.number}</div>
  <div>${data.doctorName || ''}</div>
  ${data.patientName ? `<div>${data.patientName}</div>` : ''}
</div>
`;
}

function generateServiceReceipt(data) {
  let servicesHTML = '';
  if (data.services && data.services.length > 0) {
    servicesHTML = data.services.map(s =>
      `<div class="row"><span>${s.name}</span><span>${Number(s.price).toLocaleString()} so'm</span></div>`
    ).join('');
  }

  return `
<div>
  <div class="row"><span>Bemor:</span><span class="bold">${data.patientName || '—'}</span></div>
  ${data.doctorName ? `<div class="row"><span>Shifokor:</span><span>${data.doctorName}</span></div>` : ''}
  <div class="line"></div>
  ${servicesHTML}
  <div class="line"></div>
  ${data.discount ? `<div class="row"><span>Chegirma:</span><span>${data.discount}%</span></div>` : ''}
  <div class="row total"><span>JAMI:</span><span>${Number(data.total || 0).toLocaleString()} so'm</span></div>
  <div class="row"><span>To'lov:</span><span>${data.paymentType === 'cash' ? 'Naqd' : data.paymentType === 'card' ? 'Karta' : data.paymentType === 'debt' ? 'Qarz' : 'O\'tkazma'}</span></div>
</div>
`;
}

function generatePayoutReceipt(data) {
  return `
<div class="center">
  <div class="bold" style="font-size: 14px;">SHIFOKORGA TO'LOV (BERILDI)</div>
  <div style="font-size: 18px; font-weight: bold; margin: 8px 0;">${Number(data.amount).toLocaleString()} so'm</div>
  <div class="line"></div>
  <div class="row"><span>Shifokor:</span><span class="bold">${data.doctorName || '—'}</span></div>
  <div class="row"><span>Yo'nalishi:</span><span>${data.specialty || '—'}</span></div>
  <div class="line"></div>
  <div class="row"><span>Asos:</span><span>${data.percentage}% ulush</span></div>
  <div class="row"><span>Tushum:</span><span>${Number(data.revenue).toLocaleString()} so'm</span></div>
  ${data.note ? `<div style="font-style: italic; font-size: 10px; margin-top: 5px; text-align: left;">Izoh: ${data.note}</div>` : ''}
</div>
`;
}

export async function printReceipt(data) {
  const settings = await getClinicSettings();
  const html = generateReceiptHTML(data, settings);

  if (window.electronAPI?.print?.receipt) {
    const opts = {
      silent: true,
      width: settings.receiptWidth === '58' ? 220 : settings.receiptWidth === '110' ? 420 : 300,
    };
    if (settings.printerName) {
      opts.printerName = settings.printerName;
    }
    return await window.electronAPI.print.receipt(html, opts);
  }

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    setTimeout(() => printWindow.close(), 1000);
  }

  return { success: true };
}
