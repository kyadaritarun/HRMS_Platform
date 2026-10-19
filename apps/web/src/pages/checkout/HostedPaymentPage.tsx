import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  IconShieldCheck,
  IconCheck,
  IconReceipt,
  IconCopy,
  IconBuilding,
  IconArrowRight,
  IconLock,
  IconSparkles,
  IconAlertCircle,
  IconCreditCard,
  IconQrcode,
} from '@tabler/icons-react';

interface OrderData {
  id: number;
  orderId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  subdomain: string;
  planType: string;
  amount: number | string;
  currency: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  isUpgrade: boolean;
  package: {
    id: number;
    name: string;
    description: string;
    employeeLimit: number;
    enabledFeatures: string[];
  };
  meta?: any;
}

export const HostedPaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId') || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    companyName: string;
    subdomain: string;
    adminEmail: string;
    tempPassword?: string;
    invoiceNumber?: string;
    isUpgrade?: boolean;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Invalid payment URL. Missing proposal or order reference.');
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get(`/subscription/order/${orderId}`);
        setOrder(res.data?.order || null);
        setRazorpayKeyId(res.data?.razorpayKeyId || '');

        if (res.data?.order?.status === 'PAID') {
          setPaymentSuccessData({
            companyName: res.data.order.companyName,
            subdomain: res.data.order.subdomain,
            adminEmail: res.data.order.contactEmail,
            isUpgrade: res.data.order.isUpgrade,
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load order proposal. It may have expired or been removed.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCompletePayment = async (paymentId: string, signature?: string) => {
    setIsProcessing(true);
    try {
      const res = await api.post('/subscription/verify-payment', {
        orderId,
        paymentId,
        paymentSignature: signature,
        paymentMethod: 'Razorpay UPI / Cards',
      });

      const result = res.data?.result;
      setPaymentSuccessData({
        companyName: order?.companyName || 'Your Company',
        subdomain: order?.subdomain || '',
        adminEmail: order?.contactEmail || '',
        tempPassword: result?.tempPassword || 'Auto-emailed to ' + order?.contactEmail,
        invoiceNumber: result?.invoice?.invoiceNumber,
        isUpgrade: result?.isUpgrade,
      });

      if (order) {
        setOrder({ ...order, status: 'PAID' });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment verification failed. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Razorpay Standard Checkout
  const handleRazorpayCheckout = () => {
    if (!order) return;

    // Check if live Razorpay SDK is available
    if (typeof (window as any).Razorpay !== 'undefined' && razorpayKeyId && !razorpayKeyId.includes('mock')) {
      const options = {
        key: razorpayKeyId,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency || 'INR',
        name: 'Uptrix HRMS',
        description: `${order.package?.name || 'Subscription'} - ${order.companyName}`,
        handler: function (response: any) {
          handleCompletePayment(response.razorpay_payment_id, response.razorpay_signature);
        },
        prefill: {
          name: order.contactName,
          email: order.contactEmail,
          contact: order.contactPhone || '',
        },
        theme: {
          color: '#5E4BE2',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      // Sandbox mode: Execute safe test payment
      const mockPayId = `pay_rzp_mock_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;
      handleCompletePayment(mockPayId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#5E4BE2] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Loading Secure Checkout...</h2>
          <p className="text-xs text-slate-500">Retrieving proposal details from Uptrix billing engine.</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <IconAlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Checkout Link Unavailable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error || 'Proposal could not be loaded.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const meta = order.meta || {};
  const baseAmount = meta.baseAmount || Number(order.amount) / 1.18;
  const gstAmount = meta.gstAmount || Number(order.amount) - baseAmount;
  const employeeLimit = meta.customEmployeeLimit || order.package?.employeeLimit || 25;
  const features: string[] = meta.customFeatures || order.package?.enabledFeatures || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-[#f8fafc] to-[#ede9fe]/40 py-12 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="max-w-4xl w-full">
        {/* Top Uptrix Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E4BE2] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#5E4BE2]/30">
              U
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">UPTRIX HRMS</h1>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Official Razorpay Checkout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <IconShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit SSL Secure Gateway</span>
          </div>
        </div>

        {paymentSuccessData ? (
          /* SUCCESS CELEBRATION CARD */
          <div className="bg-white rounded-3xl border border-emerald-200/80 shadow-2xl overflow-hidden p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <IconCheck className="w-8 h-8 stroke-[2.5]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase mb-3">
              Payment Confirmed • Workspace Active
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {paymentSuccessData.isUpgrade
                ? 'Subscription Upgraded Successfully!'
                : `Welcome, ${paymentSuccessData.companyName}!`}
            </h2>

            <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
              {paymentSuccessData.isUpgrade
                ? 'Your company tier and employee limits have been instantly updated. Your official GST tax receipt has been generated.'
                : 'Your company tenant has been provisioned and your administrator account is ready. A confirmation email with credentials and receipt has been sent.'}
            </p>

            {/* Credentials Card (for new company) */}
            {!paymentSuccessData.isUpgrade && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-lg mx-auto my-6 text-left space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Company Workspace Access
                  </span>
                  <span className="text-xs font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Workspace URL</span>
                    <strong className="text-[#5E4BE2] text-sm">
                      {paymentSuccessData.subdomain}.uptrix.io
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Admin Login Email</span>
                    <strong className="text-slate-900 font-mono text-xs">
                      {paymentSuccessData.adminEmail}
                    </strong>
                  </div>

                  {paymentSuccessData.tempPassword && (
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-rose-200">
                      <div>
                        <span className="text-rose-500 block text-[10px] uppercase font-bold">
                          Temporary Password
                        </span>
                        <code className="text-rose-700 font-bold text-sm font-mono">
                          {paymentSuccessData.tempPassword}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopy(paymentSuccessData.tempPassword!, 'pwd')}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                        {copiedField === 'pwd' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-lg shadow-[#5E4BE2]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Login</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* PAYMENT PROPOSAL & CHECKOUT CARD */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Plan & Company Breakdown */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider bg-[#5E4BE2]/10 text-[#5E4BE2] border border-[#5E4BE2]/20 uppercase mb-2">
                  Official SaaS Platform Proposal
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {order.companyName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tenant Subdomain: <strong className="text-slate-800">{order.subdomain}.uptrix.io</strong>
                </p>
              </div>

              {/* Package Details */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{order.package?.name}</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200/70 text-slate-700">
                    {order.planType}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{order.package?.description}</p>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 flex items-center justify-between font-semibold">
                  <span>Authorized Seat Capacity:</span>
                  <span className="text-[#5E4BE2] font-bold">Up to {employeeLimit} employees</span>
                </div>
              </div>

              {/* Features Included */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Included Enterprise Modules:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCheck className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium text-slate-800">
                        {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Reference */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div>
                  Recipient Contact: <strong>{order.contactName}</strong> ({order.contactEmail})
                </div>
                {order.contactPhone && <div>Phone: <strong>{order.contactPhone}</strong></div>}
              </div>
            </div>

            {/* Right Column: Order Summary & Razorpay Action */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <IconReceipt className="w-5 h-5 text-[#5E4BE2]" />
                    Order Summary
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">SAC Code 998313 • Indian GST</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Subscription Fee ({order.planType}):</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      ₹{Number(baseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Goods & Services Tax (18% GST):</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      ₹{Number(gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                    <span className="text-2xl font-black text-[#5E4BE2] font-mono">
                      ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#5E4BE2]/5 border border-[#5E4BE2]/15 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <IconSparkles className="w-4 h-4 text-[#5E4BE2]" />
                    Instant Cloud Activation
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Upon payment confirmation, your tenant workspace, administrator login credentials, and official GST tax receipt will be issued immediately.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleRazorpayCheckout}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-lg shadow-[#5E4BE2]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <IconCreditCard className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'Processing Payment...' : `Pay ₹${Number(order.amount).toLocaleString('en-IN')} via Razorpay`}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                  <IconLock className="w-3.5 h-3.5" />
                  <span>Razorpay Trusted • UPI, GPay, Cards, Netbanking</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostedPaymentPage;
