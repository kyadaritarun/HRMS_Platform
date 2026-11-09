import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconGift,
  IconSearch,
  IconFilter,
  IconPlus,
  IconCheck,
  IconTruck,
  IconCalendarEvent,
  IconAward,
  IconSparkles,
  IconUser,
  IconMapPin,
  IconX,
  IconExternalLink,
  IconDownload,
  IconClock,
  IconCreditCard,
  IconMail,
  IconSend,
  IconBuilding,
  IconReceiptTax,
  IconPackage,
  IconAlertCircle,
  IconChevronDown,
} from '@tabler/icons-react';

export interface GiftCatalogItem {
  id: string;
  name: string;
  category: 'ONBOARDING' | 'ANNIVERSARY' | 'FESTIVE' | 'VOUCHER';
  tagline: string;
  price: number;
  deliveryDays: string;
  badge: string;
  badgeColor: string;
  itemsIncluded: string[];
  recommendedFor: string;
  iconBg: string;
}

export interface DispatchedGiftOrder {
  id: string;
  employeeId: number;
  employeeNumber: string;
  employeeName: string;
  department: string;
  avatarColor: string;
  giftId: string;
  giftName: string;
  occasion: string;
  customMessage: string;
  deliveryMode: 'DOORSTEP_COURIER' | 'OFFICE_DESK' | 'INSTANT_EMAIL';
  deliveryAddress: string;
  trackingNumber: string;
  courierPartner: string;
  dispatchedDate: string;
  estimatedDelivery: string;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'PROCESSING';
}

const GIFT_CATALOG: GiftCatalogItem[] = [
  {
    id: 'swag-kit',
    name: 'Executive Welcome Swag Kit',
    category: 'ONBOARDING',
    tagline: 'Make first impressions unforgettable with premium branded gear.',
    price: 1499,
    deliveryDays: '3-5 business days',
    badge: 'Popular for New Hires',
    badgeColor: 'bg-indigo-50 text-[#5E4BE2] border-indigo-200/80',
    iconBg: 'bg-indigo-50 text-[#5E4BE2]',
    itemsIncluded: [
      'Custom Embroidered Cotton Hoodie',
      'Insulated Stainless Steel Sipper (750ml)',
      'Hardbound Debossed Corporate Journal',
      '15W Qi Wireless Fast Charging Pad',
      'Welcome Card signed by Management',
    ],
    recommendedFor: 'New Employee Day 1 Onboarding & Welcome',
  },
  {
    id: 'anniversary-box',
    name: 'Work Anniversary Milestone Trophy Box',
    category: 'ANNIVERSARY',
    tagline: 'Honor years of dedication with bespoke laser-engraved awards.',
    price: 2199,
    deliveryDays: '4-6 business days',
    badge: 'Milestone Recognition',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200/80',
    iconBg: 'bg-purple-50 text-purple-600',
    itemsIncluded: [
      'Laser-Engraved Optical Crystal Trophy',
      'Matte Black Executive Parker Rollerball Pen',
      'Smart OLED Fitness Tracker Band',
      'Framed Certificate of Continuous Service',
      'Personalized CEO Appreciation Letter',
    ],
    recommendedFor: '1, 3, 5 & 10-Year Service Anniversaries',
  },
  {
    id: 'festive-hamper',
    name: 'Festive & Celebration Gourmet Hamper',
    category: 'FESTIVE',
    tagline: 'Curated organic delights and scented artisanal keepsakes.',
    price: 999,
    deliveryDays: '2-4 business days',
    badge: 'Festivals & Holidays',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconBg: 'bg-amber-50 text-amber-600',
    itemsIncluded: [
      'California Almonds & Cashews (200g each)',
      'Artisanal Belgian Dark Chocolates Box',
      'Hand-poured Vanilla Scented Soy Candle',
      'Brass Floating Diya / Metal Ornament',
      'Festive Greeting Card with Custom Note',
    ],
    recommendedFor: 'Diwali, New Year, Women’s Day & Holidays',
  },
  {
    id: 'digital-voucher',
    name: 'Multi-Brand Digital E-Gift Voucher',
    category: 'VOUCHER',
    tagline: 'Instant reward redeemable across Amazon, Flipkart, Croma & Myntra.',
    price: 1000,
    deliveryDays: 'Instant (Email & SMS)',
    badge: 'Instant Delivery',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    iconBg: 'bg-emerald-50 text-emerald-600',
    itemsIncluded: [
      'Universal E-Gift Card (Valid 12 Months)',
      'SMS & Work Email Instant Delivery',
      'Redeemable across 200+ top Indian brands',
      'Zero Delivery Fee / No Logistics Delay',
      'Personalized Video or Digital Greeting',
    ],
    recommendedFor: 'Spot Recognitions, Hackathons & Birthdays',
  },
];

const INITIAL_ORDERS: DispatchedGiftOrder[] = [
  {
    id: 'GFT-1001',
    employeeId: 101,
    employeeNumber: 'EMP-001',
    employeeName: 'Sarah Jenkins',
    department: 'Engineering',
    avatarColor: 'bg-indigo-500',
    giftId: 'swag-kit',
    giftName: 'Executive Welcome Swag Kit',
    occasion: 'New Joiner Welcome',
    customMessage: 'Welcome to the team Sarah! Excited to build great products together.',
    deliveryMode: 'DOORSTEP_COURIER',
    deliveryAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103',
    trackingNumber: 'BD882910482',
    courierPartner: 'Blue Dart Express',
    dispatchedDate: '2026-11-02',
    estimatedDelivery: '2026-11-05',
    status: 'DELIVERED',
  },
  {
    id: 'GFT-1002',
    employeeId: 102,
    employeeNumber: 'EMP-004',
    employeeName: 'Rahul Verma',
    department: 'Product Design',
    avatarColor: 'bg-purple-500',
    giftId: 'anniversary-box',
    giftName: 'Work Anniversary Milestone Trophy Box',
    occasion: '3-Year Work Anniversary',
    customMessage: 'Happy 3rd work anniversary Rahul! Thank you for 3 years of inspiring design leadership.',
    deliveryMode: 'OFFICE_DESK',
    deliveryAddress: 'Uptrix HQ, 4th Floor Tech Park, Hyderabad 500081',
    trackingNumber: 'DEL99281742',
    courierPartner: 'Delhivery Logistics',
    dispatchedDate: '2026-11-04',
    estimatedDelivery: '2026-11-07',
    status: 'IN_TRANSIT',
  },
  {
    id: 'GFT-1003',
    employeeId: 103,
    employeeNumber: 'EMP-012',
    employeeName: 'Priya Sharma',
    department: 'Human Resources',
    avatarColor: 'bg-rose-500',
    giftId: 'festive-hamper',
    giftName: 'Festive & Celebration Gourmet Hamper',
    occasion: 'Diwali Festive Hamper',
    customMessage: 'Wishing you and your family a joyful, bright, and prosperous festive season!',
    deliveryMode: 'DOORSTEP_COURIER',
    deliveryAddress: 'Plot 45, Jubilee Hills Road No. 10, Hyderabad 500033',
    trackingNumber: 'BD771920194',
    courierPartner: 'Blue Dart Express',
    dispatchedDate: '2026-11-05',
    estimatedDelivery: '2026-11-08',
    status: 'IN_TRANSIT',
  },
  {
    id: 'GFT-1004',
    employeeId: 104,
    employeeNumber: 'EMP-018',
    employeeName: 'Amit Patel',
    department: 'Sales & Growth',
    avatarColor: 'bg-emerald-500',
    giftId: 'digital-voucher',
    giftName: 'Multi-Brand Digital E-Gift Voucher (₹2,000)',
    occasion: 'Top Performer Q3',
    customMessage: 'Congratulations on beating the Q3 sales quota by 140%! Keep shining.',
    deliveryMode: 'INSTANT_EMAIL',
    deliveryAddress: 'amit.patel@uptrix.io',
    trackingNumber: 'E-VOUCH-AMZ-9941',
    courierPartner: 'Instant Digital E-Delivery',
    dispatchedDate: '2026-11-06',
    estimatedDelivery: '2026-11-06',
    status: 'DELIVERED',
  },
  {
    id: 'GFT-1005',
    employeeId: 105,
    employeeNumber: 'EMP-025',
    employeeName: 'Deepak Kumar',
    department: 'Engineering',
    avatarColor: 'bg-amber-500',
    giftId: 'swag-kit',
    giftName: 'Executive Welcome Swag Kit',
    occasion: 'New Joiner Welcome',
    customMessage: 'Welcome to the backend engineering team Deepak!',
    deliveryMode: 'DOORSTEP_COURIER',
    deliveryAddress: 'House 12, Indiranagar 100ft Road, Bengaluru 560038',
    trackingNumber: 'DEL88192031',
    courierPartner: 'Delhivery Logistics',
    dispatchedDate: '2026-11-06',
    estimatedDelivery: '2026-11-09',
    status: 'PROCESSING',
  },
];

export const EmployeeGiftsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [orders, setOrders] = useState<DispatchedGiftOrder[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'IN_TRANSIT' | 'PROCESSING'>('ALL');
  const [occasionFilter, setOccasionFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Real or mock workspace employees for dispatch dropdown
  const [employeesList, setEmployeesList] = useState<Array<{ id: number; name: string; email: string; employeeNumber: string; department: string }>>([
    { id: 101, name: 'Sarah Jenkins', email: 'sarah.j@uptrix.io', employeeNumber: 'EMP-001', department: 'Engineering' },
    { id: 102, name: 'Rahul Verma', email: 'rahul.v@uptrix.io', employeeNumber: 'EMP-004', department: 'Product Design' },
    { id: 103, name: 'Priya Sharma', email: 'priya.s@uptrix.io', employeeNumber: 'EMP-012', department: 'Human Resources' },
    { id: 104, name: 'Amit Patel', email: 'amit.p@uptrix.io', employeeNumber: 'EMP-018', department: 'Sales & Growth' },
    { id: 105, name: 'Deepak Kumar', email: 'deepak.k@uptrix.io', employeeNumber: 'EMP-025', department: 'Engineering' },
    { id: 106, name: 'Ananya Roy', email: 'ananya.r@uptrix.io', employeeNumber: 'EMP-031', department: 'Marketing' },
  ]);

  // Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>('swag-kit');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('101');
  const [customOccasion, setCustomOccasion] = useState('New Joiner Welcome');
  const [customNote, setCustomNote] = useState('Welcome aboard! We are thrilled to have you with us.');
  const [deliveryType, setDeliveryType] = useState<'DOORSTEP_COURIER' | 'OFFICE_DESK' | 'INSTANT_EMAIL'>('DOORSTEP_COURIER');
  const [deliveryAddress, setDeliveryAddress] = useState('Office Reception Desk, 4th Floor Tech Park');
  const [voucherAmount, setVoucherAmount] = useState('1000');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch real employees if available
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees', { params: { pageSize: 50, status: 'ALL' } });
        const items = res.data?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((e: any) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName || ''}`.trim(),
            email: e.email || '',
            employeeNumber: e.employeeNumber || `EMP-${e.id}`,
            department: e.department?.name || 'General',
          }));
          setEmployeesList(mapped);
          if (mapped[0]) setSelectedEmployeeId(String(mapped[0].id));
        }
      } catch (err) {
        // Fallback to initial mock list
      }
    };
    fetchEmployees();
  }, []);

  const handleOpenSendModal = (giftId?: string) => {
    if (giftId) setSelectedGiftId(giftId);
    setIsSendModalOpen(true);
  };

  const handleDispatchGift = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDispatch(true);

    const emp = employeesList.find((e) => String(e.id) === String(selectedEmployeeId)) || employeesList[0];
    const gift = GIFT_CATALOG.find((g) => g.id === selectedGiftId) || GIFT_CATALOG[0];

    const giftDisplayName =
      gift.category === 'VOUCHER'
        ? `Multi-Brand Digital E-Gift Voucher (₹${Number(voucherAmount).toLocaleString('en-IN')})`
        : gift.name;

    const newOrder: DispatchedGiftOrder = {
      id: `GFT-${1000 + orders.length + 1}`,
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      employeeName: emp.name,
      department: emp.department,
      avatarColor: 'bg-indigo-500',
      giftId: gift.id,
      giftName: giftDisplayName,
      occasion: customOccasion,
      customMessage: customNote,
      deliveryMode: deliveryType,
      deliveryAddress: deliveryType === 'INSTANT_EMAIL' ? emp.email : deliveryAddress,
      trackingNumber: deliveryType === 'INSTANT_EMAIL' ? `E-VOUCH-${Math.floor(1000 + Math.random() * 9000)}` : `BD${Math.floor(100000000 + Math.random() * 900000000)}`,
      courierPartner: deliveryType === 'INSTANT_EMAIL' ? 'Instant Digital Delivery' : 'Blue Dart Express',
      dispatchedDate: new Date().toISOString().split('T')[0],
      estimatedDelivery: deliveryType === 'INSTANT_EMAIL' ? 'Instant' : 'In 3-4 days',
      status: deliveryType === 'INSTANT_EMAIL' ? 'DELIVERED' : 'PROCESSING',
    };

    setTimeout(() => {
      setOrders([newOrder, ...orders]);
      setIsSubmittingDispatch(false);
      setIsSendModalOpen(false);
      setToastMessage(`Gift hamper dispatched successfully to ${emp.name}!`);
      setActiveTab('orders');
      setTimeout(() => setToastMessage(null), 5000);
    }, 700);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.giftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchOccasion = occasionFilter === 'ALL' || o.occasion.toLowerCase().includes(occasionFilter.toLowerCase());

      return matchSearch && matchStatus && matchOccasion;
    });
  }, [orders, searchQuery, statusFilter, occasionFilter]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <IconCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-xs">Gift Dispatched!</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{toastMessage}</p>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 text-slate-400 hover:text-slate-600">
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================== TOP HEADER ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconGift className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Employee Gifts &amp; Recognition
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Celebrate team milestones, send new joiner welcome swag kits, work anniversary awards &amp; digital vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenSendModal()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <IconPlus className="w-4 h-4" />
            <span>Send Gift / Order Kit</span>
          </button>
        </div>
      </div>

      {/* ===================== 4 KPI STATS CARDS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gifts Sent */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              Total Gifts Sent
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {orders.length + 137}
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span>● 100% On-Time Delivery</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
            <IconGift className="w-5 h-5" />
          </div>
          <svg className="absolute -bottom-1 left-0 right-0 w-full h-4 text-indigo-500/10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path d="M0,10 Q25,0 50,10 T100,10 L100,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              Upcoming Milestones
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              6
            </div>
            <span className="text-[11px] text-purple-600 font-medium">
              Anniversaries in Next 30 Days
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <IconCalendarEvent className="w-5 h-5" />
          </div>
          <svg className="absolute -bottom-1 left-0 right-0 w-full h-4 text-purple-500/10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path d="M0,10 Q25,20 50,10 T100,10 L100,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Active Gift Bundles */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              Curated Gift Bundles
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {GIFT_CATALOG.length} Kits
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              Branded Swag &amp; Digital Cards
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <IconPackage className="w-5 h-5" />
          </div>
          <svg className="absolute -bottom-1 left-0 right-0 w-full h-4 text-amber-500/10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path d="M0,10 Q25,0 50,10 T100,10 L100,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Available Wallet Credits */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              Gift Wallet Balance
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₹18,500
            </div>
            <span className="text-[11px] text-emerald-600 font-bold">
              Tax-Exempt Per-Emp Quota
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <IconCreditCard className="w-5 h-5" />
          </div>
          <svg className="absolute -bottom-1 left-0 right-0 w-full h-4 text-emerald-500/10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path d="M0,10 Q25,20 50,10 T100,10 L100,20 L0,20 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ===================== TAB SELECTOR ===================== */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-[#5E4BE2] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <IconPackage className="w-4 h-4" />
          <span>Curated Gift Bundles &amp; Swag ({GIFT_CATALOG.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#5E4BE2] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <IconTruck className="w-4 h-4" />
          <span>Dispatched Orders &amp; Delivery Tracking ({orders.length})</span>
        </button>
      </div>

      {/* ===================== TAB 1: CATALOG ===================== */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GIFT_CATALOG.map((kit) => (
            <div
              key={kit.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#5E4BE2]/50 hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${kit.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                      <IconGift className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {kit.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {kit.recommendedFor}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${kit.badgeColor} shrink-0`}>
                    {kit.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 font-medium">
                  {kit.tagline}
                </p>

                {/* Items included checklist */}
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    What's inside this bundle:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {kit.itemsIncluded.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Price & Action Footer */}
              <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Delivery: {kit.deliveryDays}
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    ₹{kit.price.toLocaleString('en-IN')}{' '}
                    <span className="text-xs text-slate-400 font-normal">/ unit</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenSendModal(kit.id)}
                  className="px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <IconSend className="w-3.5 h-3.5" />
                  <span>Send to Employee</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================== TAB 2: ORDERS & TRACKING ===================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee, gift or tracking #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['ALL', 'DELIVERED', 'IN_TRANSIT', 'PROCESSING'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    statusFilter === st
                      ? 'bg-[#5E4BE2] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? `All (${orders.length})`
                    : st === 'DELIVERED'
                    ? 'Delivered'
                    : st === 'IN_TRANSIT'
                    ? 'In Transit'
                    : 'Processing'}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Gift Hamper / Item</th>
                    <th className="py-3.5 px-4">Occasion &amp; Note</th>
                    <th className="py-3.5 px-4">Courier / Mode</th>
                    <th className="py-3.5 px-4">Dispatched</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No gift orders found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Employee */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${ord.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                              {ord.employeeName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 leading-snug">{ord.employeeName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {ord.employeeNumber} • {ord.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Gift Item */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 leading-snug">{ord.giftName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ord.id}</div>
                        </td>

                        {/* Occasion & Note */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/60">
                            {ord.occasion}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-1" title={ord.customMessage}>
                            "{ord.customMessage}"
                          </p>
                        </td>

                        {/* Courier & Tracking */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-700">{ord.courierPartner}</div>
                          <div className="text-[10px] text-indigo-600 font-mono flex items-center gap-1 mt-0.5">
                            <IconTruck className="w-3 h-3" />
                            <span>{ord.trackingNumber}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {ord.dispatchedDate}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {ord.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Delivered
                            </span>
                          ) : ord.status === 'IN_TRANSIT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                              In Transit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Processing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="gift orders"
            />
          </div>
        </div>
      )}

      {/* ===================== SEND GIFT / ORDER KIT MODAL ===================== */}
      {isSendModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5E4BE2] flex items-center justify-center">
                    <IconGift className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Dispatch Employee Gift</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Send curated hampers or digital cards to staff</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDispatchGift} className="p-6 space-y-4 text-xs">
                {/* 1. Recipient Employee */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Select Recipient Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeNumber} • {emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Gift Bundle */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Select Gift Item / Bundle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedGiftId}
                    onChange={(e) => setSelectedGiftId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                  >
                    {GIFT_CATALOG.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} — ₹{g.price.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If voucher, allow picking amount */}
                {selectedGiftId === 'digital-voucher' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Voucher Value (INR)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['500', '1000', '2000', '5000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setVoucherAmount(amt)}
                          className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                            voucherAmount === amt
                              ? 'bg-purple-50 border-[#5E4BE2] text-[#5E4BE2]'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Occasion */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Recognition Occasion <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={customOccasion}
                    onChange={(e) => setCustomOccasion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                  >
                    <option value="New Joiner Welcome">New Joiner Welcome Swag</option>
                    <option value="1-Year Work Anniversary">1-Year Work Anniversary</option>
                    <option value="3-Year Work Anniversary">3-Year Work Anniversary</option>
                    <option value="5-Year Work Anniversary">5-Year Work Anniversary</option>
                    <option value="Birthday Celebration">Birthday Celebration</option>
                    <option value="Diwali / Festive Celebration">Diwali / Festive Celebration</option>
                    <option value="Quarterly Star Performer Award">Quarterly Star Performer Award</option>
                    <option value="Special Achievement & Appreciation">Special Achievement &amp; Appreciation</option>
                  </select>
                </div>

                {/* 4. Personalized Message */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Personalized Greeting Note
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Enter a heartfelt message to be printed on the gift card..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2]"
                  />
                </div>

                {/* 5. Delivery Mode */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Delivery Destination
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('OFFICE_DESK');
                        setDeliveryAddress('Office Reception Desk, 4th Floor Tech Park');
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                        deliveryType === 'OFFICE_DESK'
                          ? 'bg-purple-50 border-[#5E4BE2] text-[#5E4BE2] font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      🏢 Office Desk
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('DOORSTEP_COURIER');
                        setDeliveryAddress('Employee Residential Home Address (on file)');
                      }}
                      className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                        deliveryType === 'DOORSTEP_COURIER'
                          ? 'bg-purple-50 border-[#5E4BE2] text-[#5E4BE2] font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      📦 Doorstep Courier
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsSendModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDispatch}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <IconSend className="w-4 h-4" />
                    <span>{isSubmittingDispatch ? 'Dispatching...' : 'Dispatch Gift Now'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EmployeeGiftsPage;

