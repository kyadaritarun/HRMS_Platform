import PDFDocument from 'pdfkit';
import { PayslipSnapshotJson } from '../../schemas/json.js';

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

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#4F46E5');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text(data.companyName.toUpperCase(), 55, 55);
      doc.font('Helvetica').fontSize(10).text(`CONFIDENTIAL PAYSLIP — ${monthStr} ${data.year}`, 55, 80);

      // Employee Information Box
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(12).text('Employee Details', 40, 125);
      doc.rect(40, 140, 515, 60).lineWidth(1).strokeColor('#E2E8F0').stroke();

      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Employee Name:', 55, 150);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text(data.employeeName, 140, 150);

      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Designation:', 55, 165);
      doc.fontSize(9).fillColor('#0F172A').text(data.jobTitle || 'Staff', 140, 165);

      doc.fontSize(9).fillColor('#64748B').text('Department:', 320, 150);
      doc.fontSize(9).fillColor('#0F172A').text(data.departmentName || 'General', 400, 150);

      doc.fontSize(9).fillColor('#64748B').text('Pay Period:', 320, 165);
      doc.fontSize(9).fillColor('#0F172A').text(`${monthStr} ${data.year}`, 400, 165);

      // Working Days & Attendance Summary
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('Attendance & Working Days', 40, 220);
      doc.rect(40, 235, 515, 45).lineWidth(1).strokeColor('#E2E8F0').stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#64748B')
        .text('Calendar Days', 55, 245)
        .text('Working Days', 155, 245)
        .text('Present Days', 255, 245)
        .text('Paid Leaves', 355, 245)
        .text('LOP (Absent)', 455, 245);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A')
        .text(String(data.snapshot.totalCalendarDays), 55, 260)
        .text(String(data.snapshot.workingDaysCount), 155, 260)
        .text(String(data.snapshot.presentDays), 255, 260)
        .text(String(data.snapshot.paidLeaveDays), 355, 260)
        .text(String(data.snapshot.totalLopDays), 455, 260);

      // Financial Breakdown Tables (Earnings vs Deductions)
      const topY = 300;
      doc.fontSize(12).fillColor('#1E293B').text('Salary Breakdown', 40, topY);

      // Earnings Table (Left)
      doc.rect(40, topY + 20, 250, 140).lineWidth(1).strokeColor('#E2E8F0').stroke();
      doc.rect(40, topY + 20, 250, 25).fill('#F8FAFC');
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Earnings', 50, topY + 27);
      doc.text('Amount', 230, topY + 27);

      doc.fillColor('#334155').font('Helvetica').fontSize(9).text('Basic Salary', 50, topY + 55);
      doc.text(`${data.snapshot.currency} ${data.snapshot.baseSalary.toFixed(2)}`, 200, topY + 55);

      doc.text('Bonus / Incentives', 50, topY + 75);
      doc.text(`${data.snapshot.currency} ${data.snapshot.bonus.toFixed(2)}`, 200, topY + 75);

      doc.rect(40, topY + 120, 250, 40).fill('#EEF2FF');
      doc.fillColor('#4338CA').font('Helvetica-Bold').fontSize(10).text('Gross Earnings', 50, topY + 132);
      doc.text(`${data.snapshot.currency} ${data.snapshot.grossEarnings.toFixed(2)}`, 200, topY + 132);

      // Deductions Table (Right)
      doc.rect(305, topY + 20, 250, 140).lineWidth(1).strokeColor('#E2E8F0').stroke();
      doc.rect(305, topY + 20, 250, 25).fill('#F8FAFC');
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text('Deductions', 315, topY + 27);
      doc.text('Amount', 495, topY + 27);

      doc.fillColor('#334155').font('Helvetica').fontSize(9).text(`LOP Deductions (${data.snapshot.totalLopDays} days)`, 315, topY + 55);
      doc.text(`${data.snapshot.currency} ${data.snapshot.leaveDeduction.toFixed(2)}`, 465, topY + 55);

      doc.text('Other Deductions', 315, topY + 75);
      doc.text(`${data.snapshot.currency} ${data.snapshot.otherDeductions.toFixed(2)}`, 465, topY + 75);

      doc.rect(305, topY + 120, 250, 40).fill('#FFF1F2');
      doc.fillColor('#BE123C').font('Helvetica-Bold').fontSize(10).text('Total Deductions', 315, topY + 132);
      doc.text(`${data.snapshot.currency} ${data.snapshot.totalDeductions.toFixed(2)}`, 465, topY + 132);

      // Net Pay Banner
      doc.rect(40, topY + 180, 515, 60).fill('#10B981');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('NET TAKE-HOME PAY', 55, topY + 195);
      doc.fontSize(18).text(`${data.snapshot.currency} ${data.snapshot.netSalary.toFixed(2)}`, 55, topY + 212);

      // Bank Payment Info Footer
      doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(
        `Disbursement via ${data.snapshot.paymentMode} | Bank: ${data.snapshot.bankName || 'Direct'} | Account: ${data.snapshot.accountNumberMasked}`,
        40,
        topY + 260
      );

      doc.fontSize(8).text(
        'This is a computer-generated payslip authenticated by Uptrix HRMS. No physical signature required.',
        40,
        topY + 275,
        { align: 'center', width: 515 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
