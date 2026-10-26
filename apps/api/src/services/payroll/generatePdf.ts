import PDFDocument from 'pdfkit';
import { PayslipSnapshotJson } from '../../schemas/json.js';

function formatMoney(amount: number | undefined | null, currency: string = 'INR'): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
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
      const currency = data.snapshot.currency || 'INR';

      const leftX = 40;
      const rightX = 555;
      const contentW = 515;

      // 1. Master Border Top
      const topY = 35;

      // 2. Company Header
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text(data.companyName.toUpperCase(), leftX, 48, { width: contentW, align: 'center' });

      // Title Sub-Banner
      const bannerY = 74;
      doc.rect(leftX, bannerY, contentW, 20).fill('#F1F5F9');
      doc.moveTo(leftX, bannerY).lineTo(rightX, bannerY).lineWidth(1).strokeColor('#1E293B').stroke();
      doc.moveTo(leftX, bannerY + 20).lineTo(rightX, bannerY + 20).lineWidth(1).strokeColor('#1E293B').stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(
        `PAYSLIP FOR THE MONTH OF ${monthStr.toUpperCase()} ${data.year}`,
        leftX,
        bannerY + 6,
        { width: contentW, align: 'center' }
      );

      // 3. Employee Structured Matrix (Formal Corporate Grid)
      const empGridStartY = bannerY + 20;
      const rowHeight = 18;
      const col1LabelW = 95;
      const col1ValW = 160;
      const col2LabelW = 100;
      const col2ValW = 160;

      const c1ValX = leftX + col1LabelW;
      const c2LabelX = c1ValX + col1ValW;
      const c2ValX = c2LabelX + col2LabelW;

      const empRows = [
        [
          { label: 'Employee Name:', val: toTitleCase(data.employeeName) },
          { label: 'Employee Code:', val: data.employeeNumber || ('EMP-' + String(data.snapshot.workingDaysCount || '01').padStart(3, '0')) }
        ],
        [
          { label: 'Designation:', val: data.jobTitle || 'Staff' },
          { label: 'Department:', val: data.departmentName || 'General' }
        ],
        [
          { label: 'Bank Name:', val: data.snapshot.bankName || 'HDFC Bank' },
          { label: 'Bank Account No:', val: data.snapshot.accountNumberMasked || '•••• ••••' }
        ],
        [
          { label: 'Payment Mode:', val: toTitleCase(data.snapshot.paymentMode || 'Bank Transfer') },
          { label: 'Pay Period:', val: `${monthStr} ${data.year}` }
        ]
      ];

      empRows.forEach((row, i) => {
        const y = empGridStartY + i * rowHeight;
        // Horizontal grid line
        doc.moveTo(leftX, y + rowHeight).lineTo(rightX, y + rowHeight).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text(row[0].label, leftX + 8, y + 5);
        doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(row[0].val, c1ValX + 5, y + 5, { width: col1ValW - 10, ellipsis: true });

        // Col 2
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text(row[1].label, c2LabelX + 8, y + 5);
        doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(row[1].val, c2ValX + 5, y + 5, { width: col2ValW - 10, ellipsis: true });
      });

      // Vertical grid lines for Employee Grid
      const empGridEndY = empGridStartY + empRows.length * rowHeight; // 100 + 126 = 226
      doc.moveTo(c1ValX, empGridStartY).lineTo(c1ValX, empGridEndY).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
      doc.moveTo(c2LabelX, empGridStartY).lineTo(c2LabelX, empGridEndY).lineWidth(1).strokeColor('#1E293B').stroke();
      doc.moveTo(c2ValX, empGridStartY).lineTo(c2ValX, empGridEndY).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      // 4. Salary Table Header (Earnings vs Deductions)
      const salHeaderY = empGridEndY; // 226
      const salHeaderH = 20;
      doc.rect(leftX, salHeaderY, contentW, salHeaderH).fill('#F1F5F9');
      doc.moveTo(leftX, salHeaderY).lineTo(rightX, salHeaderY).lineWidth(1).strokeColor('#1E293B').stroke();
      doc.moveTo(leftX, salHeaderY + salHeaderH).lineTo(rightX, salHeaderY + salHeaderH).lineWidth(1).strokeColor('#1E293B').stroke();

      const midX = leftX + 257.5; // middle division at 297.5
      const earnAmountX = leftX + 165; // 205
      const deductAmountX = midX + 165; // 462.5

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('EARNINGS HEAD', leftX + 8, salHeaderY + 6);
      doc.text(`AMOUNT (${currency})`, earnAmountX, salHeaderY + 6, { width: 85, align: 'right' });

      doc.text('DEDUCTIONS HEAD', midX + 8, salHeaderY + 6);
      doc.text(`AMOUNT (${currency})`, deductAmountX, salHeaderY + 6, { width: 85, align: 'right' });

      // 5. Earnings & Deductions Rows
      const salBodyY = salHeaderY + salHeaderH; // 246
      const salRowH = 20;

      const customComps: { name: string; type: 'EARNING' | 'DEDUCTION'; amount: number }[] =
        (data.snapshot as any).customComponents || [];

      const earningsData = [
        { name: 'Basic Salary', val: data.snapshot.basicSalary !== undefined ? data.snapshot.basicSalary : (data.snapshot.baseSalary || 0) },
        { name: 'House Rent Allowance (HRA)', val: data.snapshot.hra || 0 },
        { name: 'Special Allowance', val: data.snapshot.specialAllowance || 0 },
        ...customComps.filter(c => c.type === 'EARNING').map(c => ({ name: c.name, val: c.amount })),
        { name: 'Bonus / Performance Incentives', val: data.snapshot.bonus || 0 },
        { name: `Overtime Pay (${(data.snapshot as any).overtimeHours || 0} hrs)`, val: (data.snapshot as any).overtimePay || 0 },
      ];

      const deductionsData = [
        { name: `Loss of Pay (LOP) [${data.snapshot.totalLopDays || 0} days]`, val: data.snapshot.leaveDeduction || 0 },
        { name: 'Provident Fund (PF)', val: (data.snapshot as any).pf || 0 },
        { name: 'Professional Tax (PT)', val: (data.snapshot as any).pt || 0 },
        { name: 'Income Tax (TDS)', val: (data.snapshot as any).tds || 0 },
        ...customComps.filter(c => c.type === 'DEDUCTION').map(c => ({ name: c.name, val: c.amount })),
        { name: 'Other Statutory Deductions', val: data.snapshot.otherDeductions || 0 },
      ];

      const rowCount = Math.max(earningsData.length, deductionsData.length);
      for (let i = 0; i < rowCount; i++) {
        const y = salBodyY + i * salRowH;
        doc.moveTo(leftX, y + salRowH).lineTo(rightX, y + salRowH).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

        // Earnings
        const e = earningsData[i];
        if (e) {
          doc.font('Helvetica').fontSize(8).fillColor('#1E293B').text(e.name, leftX + 8, y + 6);
          doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(formatMoney(e.val, ''), earnAmountX, y + 6, { width: 85, align: 'right' });
        }

        // Deductions
        const d = deductionsData[i];
        if (d) {
          doc.font('Helvetica').fontSize(8).fillColor('#1E293B').text(d.name, midX + 8, y + 6);
          doc.font('Helvetica').fontSize(8).fillColor(d.val > 0 ? '#0F172A' : '#64748B').text(formatMoney(d.val, ''), deductAmountX, y + 6, { width: 85, align: 'right' });
        }
      }

      const salBodyEndY = salBodyY + rowCount * salRowH; // 246 + 100 = 346

      // Vertical lines through salary rows
      doc.moveTo(earnAmountX - 5, salHeaderY).lineTo(earnAmountX - 5, salBodyEndY + salRowH).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
      doc.moveTo(midX, salHeaderY).lineTo(midX, salBodyEndY + salRowH).lineWidth(1.2).strokeColor('#1E293B').stroke();
      doc.moveTo(deductAmountX - 5, salHeaderY).lineTo(deductAmountX - 5, salBodyEndY + salRowH).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      // 6. Totals Row
      const totY = salBodyEndY;
      doc.rect(leftX, totY, contentW, salRowH).fill('#F8FAFC');
      doc.moveTo(leftX, totY).lineTo(rightX, totY).lineWidth(1).strokeColor('#1E293B').stroke();
      doc.moveTo(leftX, totY + salRowH).lineTo(rightX, totY + salRowH).lineWidth(1).strokeColor('#1E293B').stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Total Earnings (Gross):', leftX + 8, totY + 6);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(formatMoney(data.snapshot.grossEarnings, ''), earnAmountX, totY + 5, { width: 85, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Total Deductions:', midX + 8, totY + 6);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(formatMoney(data.snapshot.totalDeductions, ''), deductAmountX, totY + 5, { width: 85, align: 'right' });

      // 7. Net Take-Home Pay Box (Formal Corporate Strip)
      const netY = totY + salRowH; // 366
      const netH = 26;
      doc.rect(leftX, netY, contentW, netH).fill('#F1F5F9');
      doc.moveTo(leftX, netY + netH).lineTo(rightX, netY + netH).lineWidth(1).strokeColor('#1E293B').stroke();

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0F172A').text('NET PAYABLE SALARY:', leftX + 8, netY + 8);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(formatMoney(data.snapshot.netSalary, currency), midX, netY + 7, { width: 250, align: 'right' });

      // Amount in Words
      const wordsY = netY + netH; // 392
      const wordsH = 24;
      doc.moveTo(leftX, wordsY + wordsH).lineTo(rightX, wordsY + wordsH).lineWidth(1).strokeColor('#1E293B').stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Amount in Words:', leftX + 8, wordsY + 7);
      doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(
        numberToWordsINR(data.snapshot.netSalary),
        leftX + 90,
        wordsY + 7,
        { width: 415 }
      );

      // 8. Remarks & Payment Advice
      const remarksY = wordsY + wordsH; // 416
      const remarksH = 68;
      doc.moveTo(leftX, remarksY + remarksH).lineTo(rightX, remarksY + remarksH).lineWidth(1).strokeColor('#1E293B').stroke();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text('Payment Advice & Policy Notes:', leftX + 8, remarksY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
        .text(`• Mode of Transfer: ${toTitleCase(data.snapshot.paymentMode || 'Bank Transfer')} to ${data.snapshot.bankName || 'HDFC Bank'} (A/C: ${data.snapshot.accountNumberMasked || '••••'}).`, leftX + 8, remarksY + 22, { width: 495 })
        .text(`• Daily Calculation Rate: ${formatMoney(data.snapshot.perDayRate, currency)} per workable day (Base Salary ÷ ${data.snapshot.workingDaysCount || 22} workable days).`, leftX + 8, remarksY + 34, { width: 495 })
        .text(`• Attendance & LOP: Computed strictly on system check-ins. ${data.snapshot.totalLopDays || 0} days LOP deduction applied.`, leftX + 8, remarksY + 46, { width: 495 })
        .text(`• Remarks: ${data.snapshot.remarks || 'Monthly verified computerized payroll statement.'}`, leftX + 8, remarksY + 58, { width: 495 });

      // 9. System Generated Authorization Notice (One line, no box)
      const noticeY = remarksY + remarksH;
      const noticeH = 26;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(
        'System Generated Salary Statement',
        leftX,
        noticeY + 8,
        { width: contentW, align: 'center' }
      );

      // Master Outer Border
      const masterBottomY = noticeY + noticeH;
      doc.rect(leftX, topY, contentW, masterBottomY - topY).lineWidth(1).strokeColor('#1E293B').stroke();

      // 10. Official Footer Note
      const footerY = masterBottomY;
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8').text(
        'Confidential • Corporate Payroll Record • System Generated by Uptrix HRMS Platform',
        leftX,
        footerY + 12,
        { width: contentW, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
