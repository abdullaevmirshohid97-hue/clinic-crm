// electron/printer.js
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const device = new escpos.USB();
const printer = new escpos.Printer(device);

function printCheck(data) {
  device.open(() => {
    printer
      .align('CT')
      .text('DOCTOR MAGNUS')
      .text('----------------')

      .align('LT')
      .text(Xizmat: ${data.service})
      .text(Summa: ${data.amount})

      .text('----------------')

      .align('CT')
      .text('📲 Bizni kuzating')

      // 🔥 SIZNING TELEGRAM QR
      .qr('https://t.me/DoctorMagnus_24')

      .text('t.me/DoctorMagnus_24')
      .cut()
      .close();
  });
}

module.exports = { printCheck };