import PDFDocument from 'pdfkit';

interface PayslipSnapshotJson {
  baseSalary?: number;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  grossSalary?: number;
  grossEarnings?: number;
  bonus?: number;
  pf?: number;
  pt?: number;
  tds?: number;
  leaveDeduction?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  netSalary?: number;
  perDayRate?: number;
  workingDaysCount?: number;
  presentDays?: number;
  totalLopDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  currency?: string;
  paymentMode?: string;
  bankName?: string;
  accountNumberMasked?: string;
  remarks?: string;
  customComponents?: { name: string; type: 'EARNING' | 'DEDUCTION'; amount: number }[];
  [key: string]: any;
}

function formatMoney(amount: number | undefined | null, currency: string = ''): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function toTitleCase(str: string | undefined | null): string {
  if (!str) return '—';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    return a[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? inWords(n % 100) : '');
  }

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let str = '';
  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = rem;

  if (crore > 0) str += inWords(crore).trim() + ' Crore ';
  if (lakh > 0) str += inWords(lakh).trim() + ' Lakh ';
  if (thousand > 0) str += inWords(thousand).trim() + ' Thousand ';
  if (hundred > 0) str += inWords(hundred).trim() + ' ';

  str = str.trim() + ' Rupees';

  if (decimalPart > 0) {
    str += ' and ' + inWords(decimalPart).trim() + ' Paise';
  }

  return str + ' Only';
}

export function generatePayslipPdf(data: {
  companyName: string;
  companyAddress?: any;
  companyStatutory?: any;
  employeeName: string;
  employeeNumber?: string;
  jobTitle?: string;
  departmentName?: string;
  month: number;
  year: number;
  snapshot: PayslipSnapshotJson;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthStr = monthNames[data.month - 1];

      const leftX = 40;
      const rightX = 555;
      const contentW = 515;

      // 1. Company Header (Left: Name & Address; Right: Payslip from - )
      let companyAddressStr = '';
      if (data.companyAddress) {
        if (typeof data.companyAddress === 'string') {
          companyAddressStr = data.companyAddress;
        } else if (typeof data.companyAddress === 'object') {
          const parts = [
            data.companyAddress.street,
            data.companyAddress.addressLine2,
            data.companyAddress.city,
            data.companyAddress.state,
            data.companyAddress.pinCode,
          ].filter(Boolean);
          companyAddressStr = parts.join(', ');
        }
      }

      let topY = 40;
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F172A').text(data.companyName, leftX, topY, { width: 340 });
      
      const payslipHeaderRight = `Payslip from — ${monthStr} ${data.year}`;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text(payslipHeaderRight, leftX + 320, topY + 16, { width: 195, align: 'right' });

      let addrY = topY + 18;
      if (companyAddressStr) {
        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(companyAddressStr, leftX, addrY, { width: 340, lineGap: 1.5 });
        addrY += 24;
      } else {
        addrY += 12;
      }

      // Horizontal separator line
      const lineY = Math.max(addrY + 6, topY + 45);
      doc.moveTo(leftX, lineY).lineTo(rightX, lineY).lineWidth(0.8).strokeColor('#E2E8F0').stroke();

      // 2. Employee Details
      let empTitleY = lineY + 12;
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text('Employee Details', leftX, empTitleY);

      const empStartY = empTitleY + 16;
      const colW = 250;
      const labelW = 90;
      const colonW = 10;
      const valW = 145;

      const leftColX = leftX;
      const rightColX = leftX + 265;

      const snap = data.snapshot || {};
      const empLeft = [
        { label: 'Employee Name', val: data.employeeName || '-' },
        { label: 'Code', val: data.employeeNumber || '-' },
        { label: 'Designation', val: data.jobTitle || '-' },
        { label: 'Department', val: data.departmentName || '-' },
        { label: 'Date of Joining', val: snap.dateOfJoining ? new Date(snap.dateOfJoining).toLocaleDateString('en-GB') : '-' },
        { label: 'UAN Number', val: snap.uanNumber || '-' },
        { label: 'Work Location', val: snap.workLocation || snap.branchName || '-' },
      ];

      const empRight = [
        { label: 'Bank Name', val: snap.bankName || '-' },
        { label: 'Bank A/C No.', val: snap.accountNumberMasked || '-' },
        { label: 'IFSC Code', val: snap.ifscCode || '-' },
        { label: 'Branch Name', val: snap.branchName || '-' },
        { label: 'PF Number', val: snap.pfNumber || '-' },
        { label: 'ESIC Number', val: snap.esicNumber || '-' },
      ];

      const rowH = 15;
      empLeft.forEach((item, idx) => {
        const y = empStartY + idx * rowH;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text(item.label, leftColX, y, { width: labelW });
        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(':', leftColX + labelW, y, { width: colonW });
        doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(item.val, leftColX + labelW + colonW, y, { width: valW, ellipsis: true });
      });

      empRight.forEach((item, idx) => {
        const y = empStartY + idx * rowH;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text(item.label, rightColX, y, { width: labelW });
        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(':', rightColX + labelW, y, { width: colonW });
        doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(item.val, rightColX + labelW + colonW, y, { width: valW, ellipsis: true });
      });

      // 3. Earnings & Deductions Tables (Side by side)
      const tablesStartY = empStartY + Math.max(empLeft.length, empRight.length) * rowH + 14;

      const earnW = 290;
      const deductX = leftX + earnW + 15;
      const deductW = contentW - earnW - 15;

      const customComps = snap.customComponents || [];
      const earningsData = [
        { name: 'Basic Salary', val: snap.basicSalary !== undefined ? snap.basicSalary : (snap.baseSalary ? Math.round(snap.baseSalary * 0.5) : 0) },
        { name: 'House Rent Allowance (HRA)', val: snap.hra || 0 },
        { name: 'Special Allowance', val: snap.specialAllowance || 0 },
        ...customComps.filter(c => c.type === 'EARNING').map(c => ({ name: c.name, val: c.amount })),
        { name: 'Bonus / Performance Incentives', val: snap.bonus || 0 },
      ].filter(e => e.val > 0 || e.name === 'Basic Salary');

      const deductionsData = [
        { name: 'Provident Fund (PF)', val: snap.pf || 0 },
        { name: 'Professional Tax (PT)', val: snap.pt || 0 },
        { name: 'Income Tax (TDS)', val: snap.tds || 0 },
        { name: `Loss of Pay (LOP) [${snap.totalLopDays || 0}d]`, val: snap.leaveDeduction || 0 },
        ...customComps.filter(c => c.type === 'DEDUCTION').map(c => ({ name: c.name, val: c.amount })),
      ].filter(d => d.val > 0);

      const tableRowH = 17;
      const maxRows = Math.max(earningsData.length, deductionsData.length, 3);

      // Earnings Table Header
      doc.rect(leftX, tablesStartY, earnW, 20).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text('Earnings', leftX + 8, tablesStartY + 6);
      doc.text('Monthly Value (Rs.)', leftX + 130, tablesStartY + 6, { width: 75, align: 'right' });
      doc.text('Amount (Rs.)', leftX + 210, tablesStartY + 6, { width: 72, align: 'right' });

      // Earnings Rows
      for (let i = 0; i < maxRows; i++) {
        const y = tablesStartY + 20 + i * tableRowH;
        doc.rect(leftX, y, earnW, tableRowH).strokeColor('#F1F5F9').stroke();
        const e = earningsData[i];
        if (e) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(e.name, leftX + 8, y + 4, { width: 125, ellipsis: true });
          doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(formatMoney(e.val, ''), leftX + 130, y + 4, { width: 75, align: 'right' });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(formatMoney(e.val, ''), leftX + 210, y + 4, { width: 72, align: 'right' });
        }
      }

      // Earnings Total
      const earnTotY = tablesStartY + 20 + maxRows * tableRowH;
      doc.rect(leftX, earnTotY, earnW, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Total Gross Earnings', leftX + 8, earnTotY + 6);
      doc.text(formatMoney(snap.grossEarnings, ''), leftX + 130, earnTotY + 6, { width: 75, align: 'right' });
      doc.text(formatMoney(snap.grossEarnings, ''), leftX + 210, earnTotY + 6, { width: 72, align: 'right' });

      // Deductions Table Header
      doc.rect(deductX, tablesStartY, deductW, 20).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text('Deductions', deductX + 8, tablesStartY + 6);
      doc.text('Amount (Rs.)', deductX + deductW - 80, tablesStartY + 6, { width: 72, align: 'right' });

      // Deductions Rows
      for (let i = 0; i < maxRows; i++) {
        const y = tablesStartY + 20 + i * tableRowH;
        doc.rect(deductX, y, deductW, tableRowH).strokeColor('#F1F5F9').stroke();
        const d = deductionsData[i];
        if (d) {
          doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(d.name, deductX + 8, y + 4, { width: deductW - 85, ellipsis: true });
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A').text(formatMoney(d.val, ''), deductX + deductW - 80, y + 4, { width: 72, align: 'right' });
        }
      }

      // Deductions Total
      doc.rect(deductX, earnTotY, deductW, 22).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Total Deductions', deductX + 8, earnTotY + 6);
      doc.text(formatMoney(snap.totalDeductions, ''), deductX + deductW - 80, earnTotY + 6, { width: 72, align: 'right' });

      // 4. Attendance Summary Box
      const attY = earnTotY + 32;
      const attH = 50;
      doc.roundedRect(leftX, attY, contentW, attH, 4).strokeColor('#E2E8F0').stroke();

      // Left Column: Total Payable Days
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('Total Payable Days', leftX + 16, attY + 12);
      const totalDays = snap.workingDaysCount || (snap.presentDays || 0);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(`${totalDays} Days`, leftX + 16, attY + 26);

      // Divider 1
      doc.moveTo(leftX + 145, attY).lineTo(leftX + 145, attY + attH).lineWidth(0.8).strokeColor('#E2E8F0').stroke();

      // Middle Column: Worked, Holiday, Paid Leaves
      const midColX = leftX + 160;
      const midLabelW = 75;
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
      doc.text('Worked Day', midColX, attY + 8);
      doc.text(':', midColX + midLabelW, attY + 8);
      doc.font('Helvetica-Bold').text(String(snap.presentDays || 0), midColX + midLabelW + 8, attY + 8);

      doc.font('Helvetica').text('Holiday', midColX, attY + 20);
      doc.text(':', midColX + midLabelW, attY + 20);
      doc.font('Helvetica-Bold').text(String(snap.holidayDays || 0), midColX + midLabelW + 8, attY + 20);

      doc.font('Helvetica').text('Paid Leaves', midColX, attY + 32);
      doc.text(':', midColX + midLabelW, attY + 32);
      doc.font('Helvetica-Bold').text(String(snap.paidLeaveDays || 0), midColX + midLabelW + 8, attY + 32);

      // Divider 2
      doc.moveTo(leftX + 320, attY).lineTo(leftX + 320, attY + attH).lineWidth(0.8).strokeColor('#E2E8F0').stroke();

      // Right Column: Weekly Off, Unpaid Days
      const rightColAttX = leftX + 335;
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
      doc.text('Weekly Off', rightColAttX, attY + 12);
      doc.text(':', rightColAttX + midLabelW, attY + 12);
      doc.font('Helvetica-Bold').text(String(snap.weeklyOffDays || 0), rightColAttX + midLabelW + 8, attY + 12);

      doc.font('Helvetica').text('Unpaid Days', rightColAttX, attY + 26);
      doc.text(':', rightColAttX + midLabelW, attY + 26);
      doc.font('Helvetica-Bold').text(String(snap.totalLopDays || 0), rightColAttX + midLabelW + 8, attY + 26);

      // 5. Total Net Payable Banner (Mint Green box matching screenshot)
      const netY = attY + attH + 16;
      doc.roundedRect(leftX, netY, contentW, 28, 4).fillAndStroke('#ECFDF5', '#A7F3D0');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#065F46').text('Total Net Payable :', leftX + 14, netY + 9);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#065F46').text(`Rs. ${formatMoney(snap.netSalary, '')}`, leftX + 125, netY + 8);
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#047857').text(`(${numberToWordsINR(snap.netSalary || 0)})`, leftX + 250, netY + 10, { width: 250, align: 'right' });

      // 6. Footer Disclaimer
      const footerY = netY + 38;
      doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#94A3B8').text(
        'This is a computer generated payslip and does not require an authorized signature.',
        leftX,
        footerY,
        { width: contentW, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
