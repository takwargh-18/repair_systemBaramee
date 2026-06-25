import React, { useState, useEffect } from 'react';
import { 
  Monitor, Laptop, Cpu, Printer, Server, 
  Plus, Edit3, Trash2, Search, Activity,
  AlertCircle, CheckCircle2, XCircle, HardDrive,
  LayoutDashboard, Wrench, Trash, LogOut, User, Lock, Menu, X, 
  Clock, ArrowUpRight, ShieldAlert, ClipboardList,
  Package, Calendar, Sliders
} from 'lucide-react';

// URL ของ Google Apps Script Web App
const GAS_URL = "https://script.google.com/macros/s/AKfycbxhsIVIDTXAV0agoOLI3KDOuXPUx2Gy6EBmMRpn2cPIq38gPkxJmFZ_Ag5EXCqslViOyQ/exec";  

// บัญชีล็อกอินเบื้องต้น
const DEFAULT_AUTH = {
  username: "admin",
  password: "11288" 
};

export default function App() {
  // Authentication & Navigation States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [currentTab, setCurrentTab] = useState('dashboard'); // dashboard, assets, maintenance, disposal
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Application Data States
  const [equipment, setEquipment] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Alert & Confirmation States
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form State (เพิ่มช่องระบุวันที่ซื้อ สเปกเครื่อง และวันที่บันทึกจำหน่าย)
  const [formData, setFormData] = useState({
    name: '',
    category: 'คอมพิวเตอร์',
    serial: '',
    status: 'ใช้งานปกติ',
    owner: '',
    purchaseDate: '', // วันที่ / ปี ที่ซื้อ
    specs: '',        // สเปคเครื่อง เช่น Windows 11, RAM 16GB
    disposalDate: ''  // วันที่บันทึกจำหน่าย (สำหรับสถานะรอจำหน่าย / จำหน่าย)
  });

  // โหลดข้อมูลอัตโนมัติเมื่อเข้าสู่ระบบเรียบร้อยแล้ว
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  // ฟังก์ชันสลับการแจ้งเตือน Alert บนหน้าจอแทนการใช้ window.alert
  const showAlert = (message, type = 'success') => {
    setAlertMessage({ message, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 3000);
  };

  // ดึงข้อมูลครุภัณฑ์จาก Google Sheet
  const fetchData = async () => {
    if (!GAS_URL) return; 
    setLoading(true);
    try {
      const response = await fetch(GAS_URL);
      const result = await response.json();
      if (result.status === 'success') {
        setEquipment(result.data || []);
      } else {
        showAlert('ไม่สามารถดึงข้อมูลได้สำเร็จ', 'error');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setLoading(false);
    }
  };

  // จัดการล็อกอิน
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === DEFAULT_AUTH.username && loginForm.password === DEFAULT_AUTH.password) {
      setIsLoggedIn(true);
      setLoginError('');
      showAlert('ยินดีต้อนรับเข้าสู่ระบบจัดการครุภัณฑ์');
    } else {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  // จัดการล็อกเอาต์
  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginForm({ username: '', password: '' });
    setCurrentTab('dashboard');
    showAlert('ออกจากระบบเรียบร้อยแล้ว');
  };

  // บันทึก/แก้ไขข้อมูลส่งไปยัง Google Sheet
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const isEditing = !!editingItem;
    const payload = {
      id: isEditing ? editingItem.id : crypto.randomUUID(),
      ...formData
    };

    // อัปเดตแบบ Local ทันทีเพื่อให้ผู้ใช้งานไม่ต้องรอโหลด (Optimistic UI)
    if (isEditing) {
      setEquipment(prev => prev.map(item => item.id === payload.id ? payload : item));
      showAlert('แก้ไขข้อมูลสำเร็จเรียบร้อย');
    } else {
      setEquipment(prev => [payload, ...prev]);
      showAlert('เพิ่มข้อมูลครุภัณฑ์สำเร็จ');
    }

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: isEditing ? 'update' : 'add',
            data: payload
          })
        });
      } catch (error) {
        console.error("Error saving data:", error);
        showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังระบบคลาวด์', 'error');
      }
    }
    
    setLoading(false);
    closeModal();
  };

  // ร้องขอเพื่อทำการลบข้อมูล
  const requestDelete = (id) => {
    setConfirmDeleteId(id);
  };

  // ยืนยันการลบข้อมูลครุภัณฑ์ออกอย่างถาวร
  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    
    const targetId = confirmDeleteId;
    setConfirmDeleteId(null);
    setLoading(true);
    
    setEquipment(prev => prev.filter(item => item.id !== targetId));
    showAlert('ลบข้อมูลครุภัณฑ์เรียบร้อยแล้ว');

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            data: { id: targetId }
          })
        });
      } catch (error) {
        console.error("Error deleting data:", error);
        showAlert('เกิดข้อผิดพลาดในการลบข้อมูลที่เซิร์ฟเวอร์', 'error');
      }
    }
    setLoading(false);
  };

  // ฟังก์ชันลัดในการอัปเดตสถานะของอุปกรณ์โดยตรง (เช่น ซ่อมเสร็จ หรือ เปลี่ยนเป็นรอจำหน่าย)
  const quickUpdateStatus = async (item, newStatus) => {
    setLoading(true);
    
    // ตั้งค่าวันจำหน่ายอัตโนมัติหากเปลี่ยนเป็น รอจำหน่าย หรือ แทงจำหน่าย
    let currentDisposalDate = item.disposalDate || '';
    if (newStatus === 'รอจำหน่าย' || newStatus === 'จำหน่าย') {
      const today = new Date();
      currentDisposalDate = today.toISOString().split('T')[0];
    }

    const updatedItem = { 
      ...item, 
      status: newStatus,
      disposalDate: currentDisposalDate 
    };

    setEquipment(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    showAlert(`อัปเดตสถานะเป็น "${newStatus}" สำเร็จ`);

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'update',
            data: updatedItem
          })
        });
      } catch (error) {
        console.error("Error updating status:", error);
        showAlert('เกิดข้อผิดพลาดในการเซฟข้อมูลที่ Google Sheets', 'error');
      }
    }
    setLoading(false);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        category: item.category || 'คอมพิวเตอร์',
        serial: item.serial || '',
        status: item.status || 'ใช้งานปกติ',
        owner: item.owner || '',
        purchaseDate: item.purchaseDate || '',
        specs: item.specs || '',
        disposalDate: item.disposalDate || ''
      });
    } else {
      setEditingItem(null);
      setFormData({ 
        name: '', 
        category: 'คอมพิวเตอร์', 
        serial: '', 
        status: 'ใช้งานปกติ', 
        owner: '',
        purchaseDate: '',
        specs: '',
        disposalDate: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // คำนวณ Metric สถิติต่างๆ สำหรับหน้า Dashboard
  const stats = {
    total: equipment.length,
    active: equipment.filter(item => item.status === 'ใช้งานปกติ' || item.status === 'สำรอง').length,
    repair: equipment.filter(item => item.status === 'ส่งซ่อม').length,
    pendingDisposal: equipment.filter(item => item.status === 'รอจำหน่าย').length,
    disposed: equipment.filter(item => item.status === 'จำหน่าย').length,
  };

  // หมวดหมู่และสถิติการใช้งานแยกตามประเภทอุปกรณ์
  const categorySummary = {
    computer: equipment.filter(item => item.category === 'คอมพิวเตอร์').length,
    monitor: equipment.filter(item => item.category === 'จอมอนิเตอร์').length,
    printer: equipment.filter(item => item.category === 'เครื่องพิมพ์').length,
    server: equipment.filter(item => item.category === 'เซิร์ฟเวอร์').length,
    network: equipment.filter(item => item.category === 'อุปกรณ์เครือข่าย').length,
    material: equipment.filter(item => item.category === 'วัสดุ/อะไหล่/สำนักงาน').length,
    other: equipment.filter(item => !['คอมพิวเตอร์', 'จอมอนิเตอร์', 'เครื่องพิมพ์', 'เซิร์ฟเวอร์', 'อุปกรณ์เครือข่าย', 'วัสดุ/อะไหล่/สำนักงาน'].includes(item.category)).length,
  };

  // การกรองคำค้นหา (ครอบคลุมทั้ง ชื่อผู้ถือครอง, S/N, ชื่ออุปกรณ์, สเปค และวันที่ซื้อ)
  const filteredEquipment = equipment.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.serial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.owner || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.specs || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.purchaseDate || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'คอมพิวเตอร์': return <Laptop className="w-5 h-5 text-emerald-400" />;
      case 'จอมอนิเตอร์': return <Monitor className="w-5 h-5 text-emerald-300" />;
      case 'เครื่องพิมพ์': return <Printer className="w-5 h-5 text-emerald-400" />;
      case 'เซิร์ฟเวอร์': return <Server className="w-5 h-5 text-emerald-300" />;
      case 'วัสดุ/อะไหล่/สำนักงาน': return <Package className="w-5 h-5 text-zinc-400" />;
      default: return <HardDrive className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ใช้งานปกติ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> ปกติ
          </span>
        );
      case 'ส่งซ่อม':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> ส่งซ่อม
          </span>
        );
      case 'รอจำหน่าย':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Clock className="w-3.5 h-3.5" /> รอจำหน่าย
          </span>
        );
      case 'จำหน่าย':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3.5 h-3.5" /> จำหน่าย
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-300 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  // --- RENDERING VIEWS ---

  // 1. หน้าจอล็อกอิน (Login Screen) - โทนเทามิ้นท์หรูหรา
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#07090d] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* แสงเรืองแสงสีเขียวมิ้นท์และเทาที่พื้นหลัง */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-3">
              <Cpu className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">IT Baramee<span className="text-emerald-400">Computer</span></h1>
            <p className="text-xs text-zinc-400 mt-1">ระบบลงทะเบียนและควบคุมสถานะครุภัณฑ์ไอที</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">บัญชีผู้ใช้งาน / Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  required
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 text-sm text-white placeholder-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2">รหัสผ่าน / Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  required
                  placeholder="••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 text-sm text-white placeholder-zinc-700"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-555/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 font-bold text-sm tracking-wide transition-all duration-200 mt-2 flex justify-center items-center gap-2"
            >
              ลงชื่อเข้าใช้งาน <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center border-t border-zinc-800/80 pt-4">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Phrabaramee Repair Version 2.5</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200 font-sans selection:bg-emerald-500/30 flex">
      
      {/* Toast Notification แบบกลมกลืน */}
      {alertMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border animate-bounce shadow-2xl backdrop-blur-md bg-zinc-900 border-zinc-800">
          {alertMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-sm font-medium text-white">{alertMessage.message}</span>
        </div>
      )}

      {/* Confirmation Modal สำหรับการลบข้อมูล */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">ยืนยันการลบข้อมูล</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์ชิ้นนี้? ข้อมูลในระบบคลาวด์จะถูกลบออกไปอย่างถาวร</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/25 transition-all"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR DESKTOP (โทนเทามิ้นท์) --- */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-950 border-r border-zinc-850 shrink-0 justify-between p-4 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-zinc-900">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-md font-bold text-white tracking-wide">Phrabaramee<span className="text-emerald-400">Repair</span></h1>
              <p className="text-[10px] text-zinc-500">ระบบคลังครุภัณฑ์และการจัดการ</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'dashboard' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>แดชบอร์ดสรุปผล</span>
              </div>
            </button>

            <button 
              onClick={() => setCurrentTab('assets')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'assets' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4" />
                <span>ทะเบียนครุภัณฑ์</span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${currentTab === 'assets' ? 'bg-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>{stats.total}</span>
            </button>

            <button 
              onClick={() => setCurrentTab('maintenance')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'maintenance' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4" />
                <span>งานส่งซ่อมบำรุง</span>
              </div>
              {stats.repair > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold border border-amber-500/10">
                  {stats.repair}
                </span>
              )}
            </button>

            <button 
              onClick={() => setCurrentTab('disposal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'disposal' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash className="w-4 h-4" />
                <span>บันทึกรอจำหน่าย / จำหน่าย</span>
              </div>
              {(stats.pendingDisposal > 0 || stats.disposed > 0) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold">
                  {stats.pendingDisposal + stats.disposed}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Info & Logout (คุมโทนแอดมินตามไอคอนในรูปภาพของคุณ) */}
        <div className="border-t border-zinc-900 pt-4 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">
              AD
            </div>
            <div>
              <p className="text-xs font-bold text-white">Admin</p>
              <p className="text-[10px] text-zinc-500">IT TAK</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all rounded-xl text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 max-w-xs bg-zinc-950 border-r border-zinc-900 p-4 justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-base">Phrabaramee Repair</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button 
                  onClick={() => { setCurrentTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>แดชบอร์ดสรุปผล</span>
                </button>

                <button 
                  onClick={() => { setCurrentTab('assets'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'assets' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ClipboardList className="w-4 h-4" />
                    <span>ทะเบียนครุภัณฑ์</span>
                  </div>
                  <span className="text-xs bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded">{stats.total}</span>
                </button>

                <button 
                  onClick={() => { setCurrentTab('maintenance'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'maintenance' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4" />
                    <span>งานส่งซ่อมบำรุง</span>
                  </div>
                  {stats.repair > 0 && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">{stats.repair}</span>}
                </button>

                <button 
                  onClick={() => { setCurrentTab('disposal'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'disposal' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trash className="w-4 h-4" />
                    <span>บันทึกรอจำหน่าย / จำหน่าย</span>
                  </div>
                  {stats.pendingDisposal > 0 && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">{stats.pendingDisposal}</span>}
                </button>
              </nav>
            </div>

            <div className="border-t border-zinc-900 pt-4 space-y-3">
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">AD</div>
                <div>
                  <p className="text-xs font-bold text-white">Admin</p>
                  <p className="text-[10px] text-zinc-500">IT TAK</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-rose-400 rounded-xl text-xs">
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE WRAPPER --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR / HEADER */}
        <header className="sticky top-0 z-30 bg-[#07090d]/90 backdrop-blur-md border-b border-zinc-900 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {currentTab === 'dashboard' && 'แผงควบคุมหลัก & การสรุปผล'}
                {currentTab === 'assets' && 'ทะเบียนครุภัณฑ์และระบบบันทึกข้อมูล'}
                {currentTab === 'maintenance' && 'ระบบควบคุมติดตามงานแจ้งส่งซ่อม'}
                {currentTab === 'disposal' && 'บันทึกรายการรอแทงจำหน่ายและประวัติเสียหาย'}
              </h2>
              <p className="text-xs text-zinc-500 hidden sm:block">
                {currentTab === 'dashboard' && 'ข้อมูลเชิงลึกและประสิทธิภาพการใช้งานครุภัณฑ์โดยรวมของโรงพยาบาล'}
                {currentTab === 'assets' && 'จัดการประวัติ บันทึกสเปคเครื่อง วันที่ซื้อ เพื่อความสะดวกในการตรวจสอบ'}
                {currentTab === 'maintenance' && 'ติดตามและรายงานขั้นตอนการส่งซ่อม บำรุงรักษาเชิงป้องกัน'}
                {currentTab === 'disposal' && 'ตรวจสอบครุภัณฑ์ที่เตรียมดำเนินการจำหน่าย และประวัติการจัดเก็บตามรอบปี'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentTab === 'assets' && (
              <button 
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-600/10 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มครุภัณฑ์ใหม่
              </button>
            )}
            
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all"
              title="ดึงข้อมูลล่าสุด"
            >
              <Activity className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* --- PAGES CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* TAB 1: DASHBOARD VIEW (Mint Green-Gray Styled Cards) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stats Cards (เพิ่มช่องรอจำหน่าย) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden group hover:border-zinc-800 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ClipboardList className="w-24 h-24 text-white" />
                  </div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">อุปกรณ์ทั้งหมด</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2">{stats.total}</h3>
                  <span className="text-[10px] text-zinc-500 block mt-1.5">ระบบซิงก์ Cloud</span>
                </div>

                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden group hover:border-zinc-800 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle2 className="w-24 h-24 text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">ปกติ/สำรอง</p>
                  <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.active}</h3>
                  <span className="text-[10px] text-zinc-500 block mt-1.5">พร้อมใช้งานในระบบ</span>
                </div>

                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden group hover:border-zinc-800 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Wrench className="w-24 h-24 text-amber-400" />
                  </div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">กำลังส่งซ่อม</p>
                  <h3 className="text-3xl font-extrabold text-amber-400 mt-2">{stats.repair}</h3>
                  <span className="text-[10px] text-zinc-500 block mt-1.5">อยู่ระหว่างการดำเนินการ</span>
                </div>

                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden group hover:border-zinc-800 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock className="w-24 h-24 text-orange-400" />
                  </div>
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">รอจำหน่าย</p>
                  <h3 className="text-3xl font-extrabold text-orange-400 mt-2">{stats.pendingDisposal}</h3>
                  <span className="text-[10px] text-zinc-500 block mt-1.5">เตรียมจำหน่าย</span>
                </div>

                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850 relative overflow-hidden group hover:border-zinc-800 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Trash className="w-24 h-24 text-zinc-500" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">แทงจำหน่าย</p>
                  <h3 className="text-3xl font-extrabold text-zinc-400 mt-2">{stats.disposed}</h3>
                  <span className="text-[10px] text-zinc-500 block mt-1.5">ยกเลิกการครอบครองแล้ว</span>
                </div>
              </div>

              {/* Charts & Quick Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Category Breakdown */}
                <div className="lg:col-span-2 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-emerald-400" /> สัดส่วนแยกตามหมวดหมู่
                    </h4>
                    <span className="text-xs text-zinc-500">รวม 7 กลุ่มหลัก</span>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* PC */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Laptop className="w-3.5 h-3.5" /> คอมพิวเตอร์ / โน้ตบุ๊ก</span>
                        <span className="text-white">{categorySummary.computer} เครื่อง</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.computer / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Monitors */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> จอมอนิเตอร์</span>
                        <span className="text-white">{categorySummary.monitor} เครื่อง</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.monitor / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Printers */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> เครื่องพิมพ์</span>
                        <span className="text-white">{categorySummary.printer} เครื่อง</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-zinc-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.printer / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Servers */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5" /> เซิร์ฟเวอร์</span>
                        <span className="text-white">{categorySummary.server} ระบบ</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.server / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Network Devices */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> อุปกรณ์เครือข่าย</span>
                        <span className="text-white">{categorySummary.network} อุปกรณ์</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-300 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.network / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Materials */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> วัสดุ / อะไหล่ / อุปกรณ์สำนักงาน</span>
                        <span className="text-white">{categorySummary.material} รายการ</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-zinc-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.total > 0 ? (categorySummary.material / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Items Sidebar in Dashboard */}
                <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-850 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-zinc-850">
                    <Clock className="w-4 h-4 text-emerald-400" /> รายการล่าสุด
                  </h4>
                  
                  {equipment.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">ไม่มีข้อมูลครุภัณฑ์ขณะนี้</p>
                  ) : (
                    <div className="space-y-3">
                      {equipment.slice(0, 4).map((item, index) => (
                        <div key={item.id || index} className="flex items-center justify-between p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-850/80">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="truncate max-w-[120px]">
                              <p className="text-xs font-bold text-white truncate">{item.name}</p>
                              <p className="text-[9px] text-zinc-500 font-mono truncate">{item.specs || item.serial || 'ไม่มีรายละเอียด'}</p>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: REGISTER ASSETS VIEW (ตารางรายละเอียดพร้อมแสดงวันซื้อ + สเปค) */}
          {currentTab === 'assets' && (
            <div className="space-y-6">
              
              {/* Search Block */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาตามชื่อ, S/N, สเปค, วันที่ซื้อ, ผู้ถือครอง..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all text-sm placeholder-zinc-600 text-white"
                  />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto items-center justify-end">
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/30 rounded-xl border border-zinc-850">
                     <Activity className="w-4 h-4 text-emerald-400" />
                     <span className="text-sm font-medium text-zinc-300">พบการค้นหา <span className="text-emerald-400 font-bold ml-1">{filteredEquipment.length}</span> รายการ</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-zinc-900/40 rounded-2xl border border-zinc-850 overflow-hidden backdrop-blur-sm shadow-xl">
                {equipment.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                      <HardDrive className="w-8 h-8 text-zinc-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">ยังไม่มีข้อมูลครุภัณฑ์</h3>
                    <p className="text-sm text-zinc-400 mb-6">คลิกปุ่ม "เพิ่มครุภัณฑ์ใหม่" ด้านบนเพื่อเริ่มจัดเก็บลงระบบ</p>
                  </div>
                ) : filteredEquipment.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-zinc-600" />
                    <span>ไม่พบข้อมูลตรงกับที่คุณค้นหา</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 border-b border-zinc-850 text-zinc-400 font-bold text-xs tracking-wider uppercase">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปกเครื่อง</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">หมวดหมู่</th>
                          <th className="px-6 py-4">วันที่ / ปีที่ซื้อ</th>
                          <th className="px-6 py-4">ผู้ถือครอง / แผนก</th>
                          <th className="px-6 py-4">สถานะ</th>
                          <th className="px-6 py-4 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {filteredEquipment.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-900/35 transition-all group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-zinc-100">{item.name}</span>
                                  {item.specs && (
                                    <span className="text-[11px] text-emerald-400/80 font-medium mt-0.5 flex items-center gap-1">
                                      <Sliders className="w-3 h-3 shrink-0" /> {item.specs}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-zinc-300 font-medium">{item.category}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs">
                                {item.purchaseDate ? (
                                  <>
                                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{item.purchaseDate}</span>
                                  </>
                                ) : (
                                  <span className="text-zinc-600">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/20">
                                  {item.owner ? item.owner.trim().charAt(0) : '?'}
                                </div>
                                <span className="text-zinc-300">{item.owner || 'ไม่มีผู้ครอบครอง'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => openModal(item)} 
                                  className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                  title="แก้ไข"
                                >
                                  <Edit3 className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                  onClick={() => requestDelete(item.id)} 
                                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                  title="ลบข้อมูลถาวร"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: MAINTENANCE / PM VIEW */}
          {currentTab === 'maintenance' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 mt-1 sm:mt-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">ระบบอัปเดตงานซ่อมบำรุงเชิงรุก</h4>
                    <p className="text-xs text-zinc-400 mt-1">รายการอุปกรณ์ที่มีสถานะ "ส่งซ่อม" จะมารวมไว้ที่หน้าต่างนี้อัตโนมัติ เพื่อจัดการอัปเดตสถานะการส่งซ่อม</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 font-semibold">ส่งซ่อมทั้งหมด:</span>
                  <span className="text-xs font-extrabold text-emerald-400">{stats.repair} เครื่อง</span>
                </div>
              </div>

              {/* List */}
              <div className="bg-zinc-900/40 rounded-2xl border border-zinc-850 overflow-hidden">
                {equipment.filter(item => item.status === 'ส่งซ่อม').length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">ยินดีด้วย! ไม่มีรายการอุปกรณ์ที่เสียหาย</h3>
                    <p className="text-sm text-zinc-400">ครุภัณฑ์และระบบคอมพิวเตอร์ทำงานร่วมกันได้อย่างสมบูรณ์แบบ</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 border-b border-zinc-850 text-zinc-400 font-bold text-xs">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปก</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">ผู้ถือครองคนล่าสุด</th>
                          <th className="px-6 py-4">สถานะปัจจุบัน</th>
                          <th className="px-6 py-4 text-right">การจัดการสถานะเร่งด่วน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {equipment.filter(item => item.status === 'ส่งซ่อม').map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-900/30 transition-all">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white">{item.name}</span>
                                  {item.specs && <span className="text-xs text-zinc-500">{item.specs}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-zinc-300">{item.owner || 'ไม่มีผู้ครอบครอง'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> อยู่ระหว่างการซ่อมแซม
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'ใช้งานปกติ')}
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-xl border border-emerald-500/20 hover:border-transparent transition-all flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ซ่อมเสร็จ (ปรับสถานะปกติ)
                                </button>
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'รอจำหน่าย')}
                                  className="px-3 py-1.5 text-xs font-bold text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-600 rounded-xl border border-orange-500/20 hover:border-transparent transition-all flex items-center gap-1.5"
                                >
                                  <Clock className="w-3.5 h-3.5" /> ปรับเป็น "รอจำหน่าย"
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: DISPOSAL VIEW (หน้าประวัติรอจำหน่าย + แทงจำหน่าย แสดง วัน/เดือน/ปี จำหน่าย) */}
          {currentTab === 'disposal' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-orange-500/5 border border-orange-555/20 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-400 mt-1 sm:mt-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">บันทึกรายการรอจำหน่าย / จำหน่าย (มีบันทึกประวัติวันจำหน่าย)</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      สรุปครุภัณฑ์ที่ชำรุดเสียหายและไม่สามารถซ่อมบำรุงต่อได้ โดยมีการระบุ <span className="text-orange-400 font-bold">"วันเดือนปีที่ระบุจำหน่าย"</span> เพื่อบันทึกเข้าสู่สารบบ
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-850">
                    <span className="text-xs text-zinc-400 font-semibold">รอจำหน่าย:</span>
                    <span className="text-xs font-extrabold text-orange-400">{stats.pendingDisposal} รายการ</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-850">
                    <span className="text-xs text-zinc-400 font-semibold">จำหน่าย:</span>
                    <span className="text-xs font-extrabold text-zinc-500">{stats.disposed} รายการ</span>
                  </div>
                </div>
              </div>

              {/* Disposal List */}
              <div className="bg-zinc-900/40 rounded-2xl border border-zinc-850 overflow-hidden">
                {equipment.filter(item => item.status === 'รอจำหน่าย' || item.status === 'จำหน่าย').length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800 text-zinc-400">
                      <Trash className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">ไม่มีรายการรอจำหน่ายในประวัติ</h3>
                    <p className="text-sm text-zinc-400">ในคลังของคุณยังไม่มีประวัติของอุปกรณ์ที่เสียหายหรือถูกสั่งจำหน่าย</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-zinc-950 border-b border-zinc-850 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปกคีย์บอร์ด</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">ผู้ครอบครองรายล่าสุด</th>
                          <th className="px-6 py-4">วันที่ซื้อมา</th>
                          <th className="px-6 py-4">วันเดือนปีที่บันทึกจำหน่าย</th>
                          <th className="px-6 py-4">สถานะจำหน่าย</th>
                          <th className="px-6 py-4 text-right">ดำเนินการอัปเดต</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {equipment.filter(item => item.status === 'รอจำหน่าย' || item.status === 'จำหน่าย').map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-900/30 transition-all">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-white">{item.name}</span>
                                  {item.specs && <span className="text-xs text-zinc-500 font-mono">{item.specs}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-zinc-300">{item.owner || 'ไม่มีผู้ครอบครอง'}</td>
                            <td className="px-6 py-4 text-zinc-400 text-xs font-mono">{item.purchaseDate || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-orange-400 font-semibold font-mono text-xs">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{item.disposalDate || 'ไม่ได้ระบุ'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === 'รอจำหน่าย' && (
                                  <button 
                                    onClick={() => quickUpdateStatus(item, 'จำหน่าย')}
                                    className="px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 transition-all"
                                  >
                                    อนุมัติ "จำหน่าย"
                                  </button>
                                )}
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'ใช้งานปกติ')}
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-xl border border-emerald-500/20 hover:border-transparent transition-all flex items-center gap-1"
                                  title="กู้คืนสถานะเป็นปกติ"
                                >
                                  กู้คืนกลับใช้งานปกติ
                                </button>
                                <button 
                                  onClick={() => requestDelete(item.id)}
                                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                  title="ลบออกจากระบบอย่างถาวร"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>

      {/* --- MODAL FOR REGISTER & EDIT EQUIPMENT (จัดสัดส่วนและโทนเขียวมิ้นท์) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl overflow-hidden transform transition-all">
            
            <div className="px-6 py-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                {editingItem ? 'แก้ไขรายละเอียดครุภัณฑ์' : 'ลงทะเบียนครุภัณฑ์ใหม่'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* ชื่ออุปกรณ์ */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">ชื่ออุปกรณ์ / รุ่นครุภัณฑ์</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all text-sm placeholder-zinc-700"
                  placeholder="เช่น Dell Optiplex 7090, จอ Monitor LG 24"
                />
              </div>

              {/* รายละเอียดสเปคเครื่อง (สเปค เช่น windows, ram) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">รายละเอียดสเปกเครื่อง (เช่น OS, CPU, RAM)</label>
                <input 
                  type="text" 
                  value={formData.specs}
                  onChange={e => setFormData({...formData, specs: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all text-sm placeholder-zinc-700"
                  placeholder="เช่น Windows 11 Pro, CPU Core i5, RAM 16GB, SSD 512"
                />
              </div>
              
              {/* หมวดหมู่ และ Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">หมวดหมู่ครุภัณฑ์</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                  >
                    <option value="คอมพิวเตอร์">คอมพิวเตอร์</option>
                    <option value="จอมอนิเตอร์">จอมอนิเตอร์</option>
                    <option value="เครื่องพิมพ์">เครื่องพิมพ์</option>
                    <option value="เซิร์ฟเวอร์">เซิร์ฟเวอร์</option>
                    <option value="อุปกรณ์เครือข่าย">อุปกรณ์เครือข่าย</option>
                    <option value="วัสดุ/อะไหล่/สำนักงาน">วัสดุ / อะไหล่ / อุปกรณ์สำนักงาน</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Serial Number (เลข S/N)</label>
                  <input 
                    type="text" 
                    value={formData.serial}
                    onChange={e => setFormData({...formData, serial: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-mono placeholder-zinc-700"
                    placeholder="S/N: 7X8Y9Z..."
                  />
                </div>
              </div>

              {/* วันที่ซื้อ และ ผู้ครอบครอง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">วันที่ / ปี ที่ซื้อ</label>
                  <input 
                    type="text" 
                    value={formData.purchaseDate}
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm placeholder-zinc-700 font-mono"
                    placeholder="เช่น 25/06/2569 หรือ ปี 2568"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">ผู้ถือครอง (แผนก / ชื่อบุคคล)</label>
                  <input 
                    type="text" 
                    value={formData.owner}
                    onChange={e => setFormData({...formData, owner: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm placeholder-zinc-700"
                    placeholder="เช่น แผนกผู้ป่วยนอก, นายสมเกียรติ"
                  />
                </div>
              </div>

              {/* สถานะปัจจุบัน และ วันที่จำหน่าย */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">สถานะการทำงาน</label>
                  <select 
                    value={formData.status}
                    onChange={e => {
                      const selectedStatus = e.target.value;
                      let updateDisposalDate = formData.disposalDate;
                      
                      // เติมวันที่จำหน่ายอัตโนมัติหากมีการเลือกจำหน่าย
                      if ((selectedStatus === 'รอจำหน่าย' || selectedStatus === 'จำหน่าย') && !formData.disposalDate) {
                        const today = new Date();
                        updateDisposalDate = today.toISOString().split('T')[0];
                      } else if (selectedStatus !== 'รอจำหน่าย' && selectedStatus !== 'จำหน่าย') {
                        updateDisposalDate = ''; // ปรับเป็นว่างหากเปลี่ยนกลับไปใช้ปกติ
                      }
                      
                      setFormData({
                        ...formData, 
                        status: selectedStatus,
                        disposalDate: updateDisposalDate
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm"
                  >
                    <option value="ใช้งานปกติ">ใช้งานปกติ</option>
                    <option value="ส่งซ่อม">ส่งซ่อม</option>
                    <option value="สำรอง">สำรองไว้ใช้งาน</option>
                    <option value="รอจำหน่าย">รอจำหน่าย</option>
                    <option value="แทงจำหน่าย">จำหน่าย</option>
                  </select>
                </div>

                {/* วันเดือปีที่บันทึกจำหน่าย (แสดงผลเมื่อเลือก รอจำหน่าย หรือ แทงจำหน่าย) */}
                {(formData.status === 'รอจำหน่าย' || formData.status === 'จำหน่าย') && (
                  <div>
                    <label className="block text-xs font-semibold text-orange-400 mb-1.5">วันเดือนปีที่บันทึกจำหน่าย</label>
                    <input 
                      type="date" 
                      value={formData.disposalDate}
                      onChange={e => setFormData({...formData, disposalDate: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-orange-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 mt-6 border-t border-zinc-800/80 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'กำลังดำเนินการบันทึก...' : 'บันทึกครุภัณฑ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Indicator แบบ Global ลื่นไหลสีกรีนมิ้นท์ */}
      {loading && !isModalOpen && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-sm flex items-center gap-2 z-50 transition-all">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="font-medium">กำลังประสานงานคลาวด์...</span>
        </div>
      )}
    </div>
  );
}
