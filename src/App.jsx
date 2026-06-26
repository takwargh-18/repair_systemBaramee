import React, { useState, useEffect } from 'react';
import { 
  Monitor, Laptop, Cpu, Printer, Server, 
  Plus, Edit3, Trash2, Search, Activity,
  AlertCircle, CheckCircle2, XCircle, HardDrive,
  LayoutDashboard, Wrench, Trash, LogOut, User, Lock, Menu, X, 
  Clock, ArrowUpRight, ShieldAlert, ClipboardList,
  Package, Calendar, Sliders, Database, BarChart3, ArrowLeftRight
} from 'lucide-react';

// URL ของ Google Apps Script Web App
const GAS_URL = "https://script.google.com/macros/s/AKfycbxhsIVIDTXAV0agoOLI3KDOuXPUx2Gy6EBmMRpn2cPIq38gPkxJmFZ_Ag5EXCqslViOyQ/exec";  

// บัญชีล็อกอิน
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
  
  // Manage Inventory Qty States (เบิกจ่าย / ปรับยอดวัสดุอุปกรณ์)
  const [isManageQtyModalOpen, setIsManageQtyModalOpen] = useState(false);
  const [selectedQtyItem, setSelectedQtyItem] = useState(null);
  const [qtyAction, setQtyAction] = useState('use'); // use (เบิกใช้งาน), dispose (จำหน่ายออก), adjust (ปรับสต๊อก)
  const [qtyValue, setQtyValue] = useState(1);
  const [qtyRecipient, setQtyRecipient] = useState('');

  // Alert & Confirmation States
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form State (ข้อมูลวันที่ซื้อ สเปกเครื่อง และวันที่บันทึกจำหน่าย)
  const [formData, setFormData] = useState({
    name: '',
    category: 'คอมพิวเตอร์',
    serial: '',
    status: 'ใช้งานปกติ',
    owner: '',
    purchaseDate: '', // วันที่ / ปี ที่ซื้อ
    specs: '',        // สเปคเครื่อง เช่น Windows 11, RAM 16GB
    disposalDate: '',  // วันที่บันทึกจำหน่าย (สำหรับสถานะรอจำหน่าย / แทงจำหน่าย)
    quantity: 1       // จำนวนวัสดุอุปกรณ์
  });

  // โหลดข้อมูลอัตโนมัติเมื่อเข้าสู่ระบบเรียบร้อยแล้ว
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  // ฟังก์ชันสลับการแจ้งเตือน Alert บนหน้าจอ
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
    const parsedQty = parseInt(formData.quantity) || 1;
    const payload = {
      id: isEditing ? editingItem.id : crypto.randomUUID(),
      ...formData,
      quantity: parsedQty
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

  // ดำเนินการหักลด/โยกย้ายสเตตัสจำนวนวัสดุคงคลัง
  const handleQtySubmit = async (e) => {
    e.preventDefault();
    if (!selectedQtyItem) return;
    setLoading(true);

    const moveQty = parseInt(qtyValue) || 0;
    const currentQty = parseInt(selectedQtyItem.quantity) || 1;

    if (qtyAction === 'use' || qtyAction === 'dispose') {
      if (moveQty > currentQty) {
        showAlert('จำนวนที่เลือกมากกว่าจำนวนที่มีอยู่ในระบบคงคลัง!', 'error');
        setLoading(false);
        return;
      }

      // 1. ลดจำนวนอุปกรณ์หรือวัสดุในสต็อกเดิม
      const updatedOriginalItem = {
        ...selectedQtyItem,
        quantity: currentQty - moveQty
      };

      // 2. สร้างรายการใหม่สำหรับการเบิกใช้งาน หรือ ชำรุดเสียหาย
      const newCreatedItem = {
        id: crypto.randomUUID(),
        name: selectedQtyItem.name,
        category: selectedQtyItem.category,
        serial: qtyAction === 'use' ? selectedQtyItem.serial : '', 
        status: qtyAction === 'use' ? 'ใช้งานปกติ' : 'แทงจำหน่าย',
        owner: qtyAction === 'use' ? qtyRecipient : selectedQtyItem.owner,
        purchaseDate: selectedQtyItem.purchaseDate || new Date().toISOString().split('T')[0],
        specs: selectedQtyItem.specs,
        disposalDate: qtyAction === 'dispose' ? new Date().toISOString().split('T')[0] : '',
        quantity: moveQty
      };

      // อัปเดตฝั่งแสดงผล (Local State)
      let tempEquipment = [...equipment];
      tempEquipment = tempEquipment.map(item => item.id === selectedQtyItem.id ? updatedOriginalItem : item);
      tempEquipment = [newCreatedItem, ...tempEquipment];

      // ถ้ายอดคงคลังเดิมเหลือเป็น 0 ชิ้น ให้เคลียร์รายการเดิมทิ้งเพื่อไม่ให้ค้างขยะคลัง
      if (updatedOriginalItem.quantity <= 0) {
        tempEquipment = tempEquipment.filter(item => item.id !== selectedQtyItem.id);
      }

      setEquipment(tempEquipment);
      showAlert(`ดำเนินการ${qtyAction === 'use' ? 'เบิกใช้งานปกติ' : 'ตัดชำรุดจำหน่ายออก'} จำนวน ${moveQty} ชิ้นเรียบร้อย!`);

      // ส่งคำขอบันทึกไปยังเซิร์ฟเวอร์ Google Sheet
      if (GAS_URL) {
        try {
          if (updatedOriginalItem.quantity <= 0) {
            await fetch(GAS_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'delete', data: { id: selectedQtyItem.id } })
            });
          } else {
            await fetch(GAS_URL, {
              method: 'POST',
              body: JSON.stringify({ action: 'update', data: updatedOriginalItem })
            });
          }

          await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add', data: newCreatedItem })
          });
        } catch (error) {
          console.error("Error syncing stock quantity:", error);
          showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์เพื่อหักยอด', 'error');
        }
      }

    } else if (qtyAction === 'adjust') {
      // ดำเนินการปรับยอดสะสมโดยตรง
      const updatedItem = {
        ...selectedQtyItem,
        quantity: moveQty
      };

      setEquipment(prev => prev.map(item => item.id === selectedQtyItem.id ? updatedItem : item));
      showAlert('ปรับข้อมูลยอดสต๊อกคงคลังสำเร็จ');

      if (GAS_URL) {
        try {
          await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update', data: updatedItem })
          });
        } catch (error) {
          console.error("Error adjusting stock value:", error);
          showAlert('ไม่สามารถซิงก์ยอดสต๊อกล่าสุดได้', 'error');
        }
      }
    }

    setLoading(false);
    setIsManageQtyModalOpen(false);
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

  // ฟังก์ชันลัดในการอัปเดตสถานะของอุปกรณ์โดยตรง
  const quickUpdateStatus = async (item, newStatus) => {
    setLoading(true);
    
    let currentDisposalDate = item.disposalDate || '';
    if (newStatus === 'รอจำหน่าย' || newStatus === 'แทงจำหน่าย') {
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

  // ฟังก์ชันสลับไปหน้าทะเบียนครุภัณฑ์พร้อมกรองหมวดหมู่ที่ถูกคลิก
  const handleCategoryClick = (categoryName) => {
    setSearchTerm(categoryName);
    setCurrentTab('assets');
    showAlert(`กรองข้อมูลตามหมวดหมู่: ${categoryName}`);
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
        disposalDate: item.disposalDate || '',
        quantity: item.quantity || 1
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
        disposalDate: '',
        quantity: 1
      });
    }
    setIsModalOpen(true);
  };

  const openQtyModal = (item) => {
    setSelectedQtyItem(item);
    setQtyValue(1);
    setQtyRecipient('');
    setQtyAction('use');
    setIsManageQtyModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // --- ระบบแยกแยะคำนวณสถิติสะสม (แยกครุภัณฑ์ กับ วัสดุอุปกรณ์ เด็ดขาด) ---

  // 1. ครุภัณฑ์ทั้งหมด (Total Assets): ไม่นับรวม 'วัสดุ/อะไหล่/สำนักงาน'
  const totalAssetsCount = equipment
    .filter(item => item.category !== 'วัสดุ/อะไหล่/สำนักงาน')
    .reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);

  // 2. วัสดุอุปกรณ์ทั้งหมด (Total Materials): นับเฉพาะ 'วัสดุ/อะไหล่/สำนักงาน'
  const totalMaterialsCount = equipment
    .filter(item => item.category === 'วัสดุ/อะไหล่/สำนักงาน')
    .reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);

  // สถิติและ Metric ดั้งเดิมของครุภัณฑ์ (ซ่อมบำรุง / จำหน่าย / สถานะ)
  const stats = {
    // แยกยอดรวมชัดเจน
    total: equipment.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    totalAssets: totalAssetsCount,
    totalMaterials: totalMaterialsCount,

    // สถานะรายยูนิตรวม
    active: equipment.filter(item => item.status === 'ใช้งานปกติ').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    backup: equipment.filter(item => item.status === 'สำรอง').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    repair: equipment.filter(item => item.status === 'ส่งซ่อม').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    pendingDisposal: equipment.filter(item => item.status === 'รอจำหน่าย').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    disposed: equipment.filter(item => item.status === 'แทงจำหน่าย').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
  };

  // *** แก้ไขจุดสำคัญ ***
  // ยอดวัสดุที่พร้อมใช้งานจริงในคลังในขณะนี้ (ต้องกรองสถานะเป็น "สำรอง" เท่านั้น เพื่อไม่นับรวมวัสดุที่เบิกจ่ายนำไปใช้งานแล้ว)
  const activeMaterialsCount = equipment
    .filter(item => item.category === 'วัสดุ/อะไหล่/สำนักงาน' && item.status === 'สำรอง')
    .reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);

  // ครุภัณฑ์ที่ถูกเบิกไปใช้งานจริงในส่วนงาน (ไม่รวมสถานะจำหน่าย / ส่งซ่อม)
  const activeAssetsInUseCount = equipment
    .filter(item => item.category !== 'วัสดุ/อะไหล่/สำนักงาน' && item.status === 'ใช้งานปกติ')
    .reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);

  // ยอดชำรุดรอจำหน่าย + แทงจำหน่ายสะสม (รวมทั้งครุภัณฑ์และวัสดุ)
  const totalDisposedCount = stats.pendingDisposal + stats.disposed;

  // การคำนวณอัตราส่วน % แบบแยกสัญชาติเด็ดขาด
  const assetsUsagePercentage = totalAssetsCount > 0 ? Math.min(Math.round((activeAssetsInUseCount / totalAssetsCount) * 100), 100) : 0;
  const materialsPercentage = totalMaterialsCount > 0 ? Math.min(Math.round((activeMaterialsCount / totalMaterialsCount) * 100), 100) : 0;
  const overallDisposalPercentage = stats.total > 0 ? Math.min(Math.round((totalDisposedCount / stats.total) * 100), 100) : 0;

  // ผลรวมสะสมยอดแต่ละประเภทในระบบเพื่อใช้แสดงผลบนหน้าแดชบอร์ดด่วน
  const categorySummary = {
    computer: equipment.filter(item => item.category === 'คอมพิวเตอร์').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    monitor: equipment.filter(item => item.category === 'จอมอนิเตอร์').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    printer: equipment.filter(item => item.category === 'เครื่องพิมพ์').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    server: equipment.filter(item => item.category === 'เซิร์ฟเวอร์').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    network: equipment.filter(item => item.category === 'อุปกรณ์เครือข่าย').reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0),
    material: totalMaterialsCount,
  };

  // การกรองคำค้นหาในตาราง
  const filteredEquipment = equipment.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.serial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.owner || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.specs || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.purchaseDate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'คอมพิวเตอร์': return <Laptop className="w-5 h-5 text-teal-600" />;
      case 'จอมอนิเตอร์': return <Monitor className="w-5 h-5 text-emerald-600" />;
      case 'เครื่องพิมพ์': return <Printer className="w-5 h-5 text-teal-600" />;
      case 'เซิร์ฟเวอร์': return <Server className="w-5 h-5 text-emerald-700" />;
      case 'วัสดุ/อะไหล่/สำนักงาน': return <Package className="w-5 h-5 text-slate-500" />;
      default: return <HardDrive className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ใช้งานปกติ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> ปกติ
          </span>
        );
      case 'ส่งซ่อม':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> ส่งซ่อม
          </span>
        );
      case 'รอจำหน่าย':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3.5 h-3.5" /> รอจำหน่าย
          </span>
        );
      case 'แทงจำหน่าย':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3.5 h-3.5" /> แทงจำหน่าย
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            {status}
          </span>
        );
    }
  };

  // --- RENDERING VIEWS ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-50/60 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-white border border-teal-100 rounded-3xl p-8 shadow-xl shadow-teal-500/5 relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-100 shadow-sm mb-3">
              <Cpu className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-wide">IT Baramee<span className="text-teal-600">Computer</span></h1>
            <p className="text-xs text-slate-500 mt-1">ระบบลงทะเบียนและควบคุมสถานะครุภัณฑ์ไอที</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">บัญชีผู้ใช้งาน / Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">รหัสผ่าน / Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  placeholder="••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md shadow-teal-600/10 font-bold text-sm tracking-wide transition-all duration-200 mt-2 flex justify-center items-center gap-2"
            >
              ลงชื่อเข้าใช้งาน <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-4">
            <span className="text-[10px] text-teal-500 font-bold uppercase tracking-widest">Phrabaramee Repair Version 3.2</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-teal-100 flex">
      
      {/* Toast Notification */}
      {alertMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border animate-bounce shadow-xl bg-white border-teal-200">
          {alertMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-teal-500" />
          )}
          <span className="text-sm font-semibold text-slate-800">{alertMessage.message}</span>
        </div>
      )}

      {/* Confirmation Modal สำหรับการลบข้อมูล */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบข้อมูล</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์ชิ้นนี้? ข้อมูลในระบบคลาวด์จะถูกลบออกไปอย่างถาวร</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-550 text-white rounded-xl shadow-md transition-all"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 justify-between p-4 sticky top-0 h-screen shadow-sm">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-100">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100 shadow-sm">
              <Cpu className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-md font-bold text-slate-900 tracking-wide">Phrabaramee<span className="text-teal-600">Repair</span></h1>
              <p className="text-[10px] text-slate-400">ระบบคลังครุภัณฑ์และการจัดการ</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === 'dashboard' 
                  ? 'bg-teal-50 text-teal-700 border border-teal-100/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>แดชบอร์ดสรุปผล</span>
              </div>
            </button>

            <button 
              onClick={() => { setSearchTerm(''); setCurrentTab('assets'); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === 'assets' 
                  ? 'bg-teal-50 text-teal-700 border border-teal-100/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4" />
                <span>ทะเบียนครุภัณฑ์</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${currentTab === 'assets' ? 'bg-teal-200 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{stats.total}</span>
            </button>

            <button 
              onClick={() => setCurrentTab('maintenance')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === 'maintenance' 
                  ? 'bg-teal-50 text-teal-700 border border-teal-100/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4" />
                <span>งานส่งซ่อมบำรุง</span>
              </div>
              {stats.repair > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  {stats.repair}
                </span>
              )}
            </button>

            <button 
              onClick={() => setCurrentTab('disposal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                currentTab === 'disposal' 
                  ? 'bg-teal-50 text-teal-700 border border-teal-100/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash className="w-4 h-4" />
                <span>บันทึกรอ / แทงจำหน่าย</span>
              </div>
              {(stats.pendingDisposal > 0 || stats.disposed > 0) && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold border border-orange-200">
                  {stats.pendingDisposal + stats.disposed}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* User Info & Logout (IT TAK) */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold border border-teal-100">
              AD
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Administrator</p>
              <p className="text-[10px] text-slate-400">IT TAK</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/5 transition-all rounded-xl text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 max-w-xs bg-white border-r border-slate-100 p-4 justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-slate-800 text-base">Phrabaramee Repair</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button 
                  onClick={() => { setCurrentTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'dashboard' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>แดชบอร์ดสรุปผล</span>
                </button>

                <button 
                  onClick={() => { setSearchTerm(''); setCurrentTab('assets'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'assets' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ClipboardList className="w-4 h-4" />
                    <span>ทะเบียนครุภัณฑ์</span>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{stats.total}</span>
                </button>

                <button 
                  onClick={() => { setCurrentTab('maintenance'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'maintenance' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4" />
                    <span>งานส่งซ่อมบำรุง</span>
                  </div>
                  {stats.repair > 0 && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">{stats.repair}</span>}
                </button>

                <button 
                  onClick={() => { setCurrentTab('disposal'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    currentTab === 'disposal' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trash className="w-4 h-4" />
                    <span>บันทึกรอ / แทงจำหน่าย</span>
                  </div>
                  {stats.pendingDisposal > 0 && <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">{stats.pendingDisposal}</span>}
                </button>
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">AD</div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Administrator</p>
                  <p className="text-[10px] text-slate-400">IT TAK</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-rose-600 rounded-xl text-xs">
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
        <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 bg-slate-50 rounded-xl border border-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-wide">
                {currentTab === 'dashboard' && 'แผงควบคุมหลัก & การสรุปผล'}
                {currentTab === 'assets' && 'ทะเบียนครุภัณฑ์และระบบบันทึกข้อมูล'}
                {currentTab === 'maintenance' && 'ระบบควบคุมติดตามงานแจ้งส่งซ่อม'}
                {currentTab === 'disposal' && 'บันทึกรายการรอแทงจำหน่ายและประวัติเสียหาย'}
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                {currentTab === 'dashboard' && 'ระบบสืบค้นข้อมูล วิเคราะห์ครุภัณฑ์ อุปกรณ์คอมพิวเตอร์ และอะไหล่คงคลัง'}
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
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all shadow-sm font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มครุภัณฑ์ใหม่
              </button>
            )}
            
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="p-2 text-slate-500 hover:text-teal-600 bg-slate-50 hover:bg-teal-55 rounded-xl border border-slate-100 transition-all"
              title="ดึงข้อมูลล่าสุด"
            >
              <Activity className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          </div>
        </header>

        {/* --- PAGES CONTAINER --- */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* TAB 1: DASHBOARD VIEW (อิงโครงร่างแผงภาพ image_bd6999.jpg แต่อัปเกรดเป็นมิ้นต์ขาว) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* แถบต้อนรับขนาดใหญ่ (Hero Header Area) */}
              <div className="text-center py-8 bg-white border border-teal-100 rounded-3xl relative overflow-hidden shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-emerald-500/5 pointer-events-none"></div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-wide">Repair System</h1>
                <p className="text-sm text-teal-600 font-bold mt-1">ระบบลงทะเบียน แจ้งซ่อมบำรุง & ควบคุมครุภัณฑ์คอมพิวเตอร์ โรงพยาบาลพระบารมี</p>
              </div>

              {/* สถิติ 3 ช่องสะสมจำนวนยูนิตจริงในคลัง (แยกยูนิตครุภัณฑ์ และวัสดุเด็ดขาด ไม่เอายอดมารวมกัน) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. จำนวนครุภัณฑ์ทั้งหมด (ไม่นับรวมวัสดุอุปกรณ์) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden hover:border-teal-300 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-extrabold text-slate-500 uppercase tracking-wider">จำนวนครุภัณฑ์ทั้งหมด</span>
                    <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-100">
                      <Laptop className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-800">{stats.totalAssets} <span className="text-xs font-normal text-slate-400">เครื่อง/ชิ้น</span></h3>
                    <p className="text-xs text-slate-400 mt-1">นับเฉพาะคอมพิวเตอร์ จอภาพ เครื่องพิมพ์ และระบบหลัก</p>
                  </div>
                </div>

                {/* 2. งานซ่อมที่ยังเปิด (ครุภัณฑ์ที่เสียหาย) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden hover:border-teal-300 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-extrabold text-amber-600 uppercase tracking-wider">งานซ่อมค้าง</span>
                    <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                      <Wrench className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-amber-600">{stats.repair} <span className="text-xs font-normal text-amber-400">รายการ</span></h3>
                    <p className="text-xs text-slate-400 mt-1">ครุภัณฑ์ที่อยู่ระหว่างส่งซ่อมแซมบำรุงรักษา</p>
                  </div>
                </div>

                {/* 3. จำนวนวัสดุคงคลังสะสม (เฉพาะกลุ่ม วัสดุ/อะไหล่/สำนักงาน ที่เหลืออยู่ในคลังจริงๆ) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden hover:border-teal-300 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-extrabold text-teal-600 uppercase tracking-wider">จำนวนวัสดุคงคลัง</span>
                    <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-100">
                      <Database className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-teal-600">{activeMaterialsCount} <span className="text-xs font-normal text-slate-400">ชิ้น</span></h3>
                    <p className="text-xs text-slate-400 mt-1">อะไหล่ วัสดุ และอุปกรณ์สำนักงานสำรองคงคลังพร้อมจ่าย</p>
                  </div>
                </div>

              </div>

              {/* กล่องวิเคราะห์ยอดสะสมคลังและการนำไปใช้งานสะสมจริง (แยกรายละเอียดของ ครุภัณฑ์ และ วัสดุอุปกรณ์) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-600" /> วิเคราะห์ยอดคลังและการเบิกใช้สอยสะสมจริง (แยกหมวดหมู่)
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">อัปเดตแบบเรียลไทม์จากระบบคลาวด์</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  
                  {/* ความคืบหน้า: อัตราการติดตั้งใช้งาน ครุภัณฑ์หลัก */}
                  <div className="space-y-2 p-4 bg-teal-50/20 rounded-xl border border-teal-50">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> อัตราครุภัณฑ์หลักติดตั้งใช้งาน</span>
                      <span className="text-teal-700 font-bold">{activeAssetsInUseCount} / {totalAssetsCount} เครื่อง ({assetsUsagePercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${assetsUsagePercentage}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">คิดเฉพาะครุภัณฑ์คอมพิวเตอร์หลักที่ส่งมอบใช้งานในหน่วยงาน</p>
                  </div>

                  {/* ความคืบหน้า: ยอดวัสดุอุปกรณ์สำรองคงคลัง */}
                  <div className="space-y-2 p-4 bg-teal-50/20 rounded-xl border border-teal-50">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><Package className="w-4 h-4 text-teal-600" /> ยอดวัสดุอุปกรณ์คงคลังคงเหลือ</span>
                      <span className="text-teal-700 font-bold">{activeMaterialsCount} / {totalMaterialsCount} รายการ ({materialsPercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${materialsPercentage}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">คิดเฉพาะสัดส่วนวัสดุและอะไหล่สำนักงานคงเหลือพร้อมสำหรับการเบิกจ่าย</p>
                  </div>

                  {/* ความคืบหน้า: ยอดชำรุดรอจำหน่าย + แทงจำหน่ายสะสมรวม */}
                  <div className="space-y-2 p-4 bg-teal-50/20 rounded-xl border border-teal-50">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><Trash className="w-4 h-4 text-rose-500" /> อัตราเสียหายสะสมระบบรวม</span>
                      <span className="text-rose-700 font-bold">{totalDisposedCount} ชิ้น ({overallDisposalPercentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${overallDisposalPercentage}%` }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">ครุภัณฑ์และวัสดุเสื่อมสภาพที่ดำเนินการเตรียมทำลาย/จำหน่ายสะสม</p>
                  </div>

                </div>
              </div>

              {/* หมวดหมู่ไอคอนด่วน 6 ช่อง สไตล์กล่อง image_bd6999.jpg */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase">สืบค้นด่วนจากประเภทครุภัณฑ์ (คลิกเพื่อค้นหารายการทันที)</h4>
                  <span className="text-xs text-slate-400 font-bold">รวมจำนวนยูนิตแยกตามกลุ่ม</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  
                  {/* 1. เครื่องพิมพ์ */}
                  <button 
                    onClick={() => handleCategoryClick('เครื่องพิมพ์')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-teal-100">
                      <Printer className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">เครื่องพิมพ์</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.printer} ยูนิต</span>
                  </button>

                  {/* 2. จอภาพ */}
                  <button 
                    onClick={() => handleCategoryClick('จอมอนิเตอร์')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-teal-100">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">จอภาพ / มอนิเตอร์</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.monitor} ยูนิต</span>
                  </button>

                  {/* 3. คีย์บอร์ด / อุปกรณ์เสริม */}
                  <button 
                    onClick={() => handleCategoryClick('อุปกรณ์เครือข่าย')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-teal-100">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">อุปกรณ์เครือข่าย/เสริม</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.network} ยูนิต</span>
                  </button>

                  {/* 4. วัสดุอะไหล่ (เฉพาะวัสดุไม่นับรวมกับครุภัณฑ์) */}
                  <button 
                    onClick={() => handleCategoryClick('วัสดุ/อะไหล่/สำนักงาน')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-slate-200">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">วัสดุ / อะไหล่สำนักงาน</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.material} รายการ</span>
                  </button>

                  {/* 5. คอมพิวเตอร์ */}
                  <button 
                    onClick={() => handleCategoryClick('คอมพิวเตอร์')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-teal-100">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">คอมพิวเตอร์ / โน้ตบุ๊ก</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.computer} ยูนิต</span>
                  </button>

                  {/* 6. เซิร์ฟเวอร์ */}
                  <button 
                    onClick={() => handleCategoryClick('เซิร์ฟเวอร์')}
                    className="p-6 bg-white border border-slate-150 rounded-2xl hover:border-teal-500 hover:shadow-md hover:bg-teal-50/10 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition-all mb-3 border border-teal-100">
                      <Server className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">ระบบเซิร์ฟเวอร์</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold mt-1.5">{categorySummary.server} ยูนิต</span>
                  </button>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REGISTER ASSETS VIEW */}
          {currentTab === 'assets' && (
            <div className="space-y-6">
              
              {/* Search Block */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาตามชื่อ, S/N, สเปค, วันที่ซื้อ, ผู้ถือครอง..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm placeholder-slate-400 text-slate-900 shadow-sm"
                  />
                </div>
                
                <div className="flex gap-4 w-full md:w-auto items-center justify-end">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-150 shadow-sm">
                     <Activity className="w-4 h-4 text-teal-600" />
                     <span className="text-sm font-semibold text-slate-600">พบการค้นหา <span className="text-teal-600 font-bold ml-1">{filteredEquipment.length}</span> รายการ</span>
                  </div>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold underline animate-pulse"
                    >
                      ล้างการกรองข้อมูล
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {equipment.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                      <HardDrive className="w-8 h-8 text-slate-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">ยังไม่มีข้อมูลครุภัณฑ์</h3>
                    <p className="text-sm text-slate-400 mb-6">คลิกปุ่ม "เพิ่มครุภัณฑ์ใหม่" ด้านบนเพื่อเริ่มจัดเก็บลงระบบ</p>
                  </div>
                ) : filteredEquipment.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-slate-300" />
                    <span>ไม่พบข้อมูลตรงกับที่คุณค้นหา</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs tracking-wider uppercase">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปกเครื่อง</th>
                          <th className="px-6 py-4">จำนวนยูนิต</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">หมวดหมู่</th>
                          <th className="px-6 py-4">วันที่ / ปีที่ซื้อ</th>
                          <th className="px-6 py-4">ผู้ถือครอง / แผนก</th>
                          <th className="px-6 py-4">สถานะ</th>
                          <th className="px-6 py-4 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredEquipment.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  {item.specs && (
                                    <span className="text-[11px] text-teal-600/80 font-bold mt-0.5 flex items-center gap-1">
                                      <Sliders className="w-3 h-3 shrink-0" /> {item.specs}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${item.category === 'วัสดุ/อะไหล่/สำนักงาน' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                                {item.quantity || 1} ชิ้น
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-slate-600 font-semibold">{item.category}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                                {item.purchaseDate ? (
                                  <>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{item.purchaseDate}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] font-bold border border-teal-100">
                                  {item.owner ? item.owner.trim().charAt(0) : '?'}
                                </div>
                                <span className="text-slate-600 font-semibold">{item.owner || 'ไม่มีผู้ครอบครอง'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => openQtyModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                  title="เบิกจ่าย / ปรับยอด"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => openModal(item)} 
                                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                  title="แก้ไขข้อมูลหลัก"
                                >
                                  <Edit3 className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                  onClick={() => requestDelete(item.id)} 
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl mt-1 sm:mt-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">ระบบอัปเดตงานซ่อมบำรุงเชิงรุก</h4>
                    <p className="text-xs text-slate-500 mt-1">รายการอุปกรณ์ที่มีสถานะ "ส่งซ่อม" จะมารวมไว้ที่หน้าต่างนี้อัตโนมัติ เพื่อจัดการอัปเดตสถานะการส่งซ่อม</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold">ส่งซ่อมทั้งหมด:</span>
                  <span className="text-xs font-extrabold text-amber-600">{stats.repair} ชิ้น</span>
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {equipment.filter(item => item.status === 'ส่งซ่อม').length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100 text-emerald-600">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">ไม่มีรายการอุปกรณ์ส่งซ่อม</h3>
                    <p className="text-sm text-slate-400">ครุภัณฑ์และระบบคอมพิวเตอร์ทำงานร่วมกันได้อย่างสมบูรณ์แบบ</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปก</th>
                          <th className="px-6 py-4">จำนวนส่งซ่อม</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">ผู้ถือครองคนล่าสุด</th>
                          <th className="px-6 py-4">สถานะปัจจุบัน</th>
                          <th className="px-6 py-4 text-right">การจัดการสถานะเร่งด่วน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {equipment.filter(item => item.status === 'ส่งซ่อม').map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-all">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  {item.specs && <span className="text-xs text-slate-400">{item.specs}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-700 font-semibold">{item.quantity || 1} ชิ้น</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-slate-600">{item.owner || 'ไม่มีผู้ครอบครอง'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> อยู่ระหว่างการซ่อมแซม
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'ใช้งานปกติ')}
                                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> ซ่อมเสร็จ (ใช้งานปกติ)
                                </button>
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'รอจำหน่าย')}
                                  className="px-3 py-1.5 text-xs font-bold text-orange-750 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-all flex items-center gap-1.5"
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

          {/* TAB 4: DISPOSAL VIEW */}
          {currentTab === 'disposal' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-orange-100 rounded-xl text-orange-700 mt-1 sm:mt-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">บันทึกรายการรอจำหน่าย / แทงจำหน่าย</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      สรุปครุภัณฑ์ที่ชำรุดเสียหายและไม่สามารถซ่อมบำรุงต่อได้ โดยมีการระบุ <span className="text-orange-700 font-bold">"วันเดือนปีที่ระบุจำหน่าย"</span> เพื่อบันทึกประวัติอย่างเป็นทางการ
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold">รอจำหน่าย:</span>
                    <span className="text-xs font-extrabold text-orange-600">{stats.pendingDisposal} ชิ้น</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-bold">แทงจำหน่าย:</span>
                    <span className="text-xs font-extrabold text-slate-500">{stats.disposed} ชิ้น</span>
                  </div>
                </div>
              </div>

              {/* Disposal List */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {equipment.filter(item => item.status === 'รอจำหน่าย' || item.status === 'แทงจำหน่าย').length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200 text-slate-400">
                      <Trash className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">ไม่มีรายการรอจำหน่ายในประวัติ</h3>
                    <p className="text-sm text-slate-400">ในคลังของคุณยังไม่มีประวัติของอุปกรณ์ที่เสียหายหรือถูกสั่งจำหน่าย</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">อุปกรณ์ / สเปก</th>
                          <th className="px-6 py-4">จำนวนจำหน่าย</th>
                          <th className="px-6 py-4">Serial Number</th>
                          <th className="px-6 py-4">ผู้ครอบครองรายล่าสุด</th>
                          <th className="px-6 py-4">วันที่ซื้อมา</th>
                          <th className="px-6 py-4">วันเดือนปีที่บันทึกจำหน่าย</th>
                          <th className="px-6 py-4">สถานะจำหน่าย</th>
                          <th className="px-6 py-4 text-right">ดำเนินการอัปเดต</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {equipment.filter(item => item.status === 'รอจำหน่าย' || item.status === 'แทงจำหน่าย').map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-all">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  {item.specs && <span className="text-xs text-slate-400 font-mono">{item.specs}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-semibold">{item.quantity || 1} ชิ้น</td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.serial || '-'}</td>
                            <td className="px-6 py-4 text-slate-600">{item.owner || 'ไม่มีผู้ครอบครอง'}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-mono">{item.purchaseDate || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-orange-600 font-bold font-mono text-xs">
                                <Calendar className="w-3.5 h-3.5 text-orange-400" />
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
                                    onClick={() => quickUpdateStatus(item, 'แทงจำหน่าย')}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-all"
                                  >
                                    อนุมัติ "แทงจำหน่าย"
                                  </button>
                                )}
                                <button 
                                  onClick={() => quickUpdateStatus(item, 'ใช้งานปกติ')}
                                  className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 hover:border-transparent transition-all flex items-center gap-1"
                                  title="กู้คืนสถานะเป็นปกติ"
                                >
                                  กู้คืนกลับใช้งานปกติ
                                </button>
                                <button 
                                  onClick={() => requestDelete(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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

      {/* --- MODAL FOR REGISTER & EDIT EQUIPMENT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden transform transition-all">
            
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-teal-600" />
                {editingItem ? 'แก้ไขรายละเอียดครุภัณฑ์' : 'ลงทะเบียนครุภัณฑ์ใหม่'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-slate-800">
              
              {/* ชื่ออุปกรณ์ */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ชื่ออุปกรณ์ / รุ่นครุภัณฑ์</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm placeholder-slate-400"
                  placeholder="เช่น Dell Optiplex 7090, จอ Monitor LG 24"
                />
              </div>

              {/* รายละเอียดสเปคเครื่อง */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">รายละเอียดสเปกเครื่อง (เช่น OS, CPU, RAM)</label>
                <input 
                  type="text" 
                  value={formData.specs}
                  onChange={e => setFormData({...formData, specs: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm placeholder-slate-400"
                  placeholder="เช่น Windows 11 Pro, CPU Core i5, RAM 16GB, SSD 512"
                />
              </div>
              
              {/* หมวดหมู่ และ Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">หมวดหมู่ครุภัณฑ์</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm"
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
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Serial Number (เลข S/N)</label>
                  <input 
                    type="text" 
                    value={formData.serial}
                    onChange={e => setFormData({...formData, serial: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-mono placeholder-slate-400"
                    placeholder="S/N: 7X8Y9Z..."
                  />
                </div>
              </div>

              {/* วันที่ซื้อ และ ผู้ครอบครอง */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">วันที่ / ปี ที่ซื้อ</label>
                  <input 
                    type="text" 
                    value={formData.purchaseDate}
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm placeholder-slate-400 font-mono"
                    placeholder="เช่น 25/06/2569 หรือ ปี 2568"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">ผู้ถือครอง (แผนก / ชื่อบุคคล)</label>
                  <input 
                    type="text" 
                    value={formData.owner}
                    onChange={e => setFormData({...formData, owner: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm placeholder-slate-400"
                    placeholder="เช่น แผนกผู้ป่วยนอก, นายสมเกียรติ"
                  />
                </div>
              </div>

              {/* จำนวนวัสดุ และสถานะปัจจุบัน */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">จำนวนของอุปกรณ์/วัสดุ</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">สถานะการทำงาน</label>
                  <select 
                    value={formData.status}
                    onChange={e => {
                      const selectedStatus = e.target.value;
                      let updateDisposalDate = formData.disposalDate;
                      
                      if ((selectedStatus === 'รอจำหน่าย' || selectedStatus === 'แทงจำหน่าย') && !formData.disposalDate) {
                        const today = new Date();
                        updateDisposalDate = today.toISOString().split('T')[0];
                      } else if (selectedStatus !== 'รอจำหน่าย' && selectedStatus !== 'แทงจำหน่าย') {
                        updateDisposalDate = ''; 
                      }
                      
                      setFormData({
                        ...formData, 
                        status: selectedStatus,
                        disposalDate: updateDisposalDate
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm"
                  >
                    <option value="ใช้งานปกติ">ใช้งานปกติ</option>
                    <option value="ส่งซ่อม">ส่งซ่อม</option>
                    <option value="สำรอง">สำรองไว้ใช้งาน</option>
                    <option value="รอจำหน่าย">รอจำหน่าย</option>
                    <option value="แทงจำหน่าย">แทงจำหน่าย</option>
                  </select>
                </div>
              </div>

              {/* วันเดือปีที่บันทึกจำหน่าย */}
              {(formData.status === 'รอจำหน่าย' || formData.status === 'แทงจำหน่าย') && (
                <div>
                  <label className="block text-xs font-semibold text-orange-600 mb-1.5">วันเดือนปีที่บันทึกจำหน่าย</label>
                  <input 
                    type="date" 
                    value={formData.disposalDate}
                    onChange={e => setFormData({...formData, disposalDate: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-white border border-orange-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-mono"
                  />
                </div>
              )}

              <div className="pt-4 mt-6 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md shadow-teal-600/10 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'กำลังดำเนินการบันทึก...' : 'บันทึกครุภัณฑ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL FOR INVENTORY DISPATCH & STOCK MANAGEMENT (เบิกจ่าย / ปรับยอดวัสดุอุปกรณ์) --- */}
      {isManageQtyModalOpen && selectedQtyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsManageQtyModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden transform transition-all">
            
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-teal-50/50">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-teal-600" />
                เบิกจ่าย / ปรับสต๊อกคงคลัง
              </h2>
              <button onClick={() => setIsManageQtyModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQtySubmit} className="p-6 space-y-4">
              {/* รายละเอียดวัสดุอุปกรณ์ปัจจุบัน */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">รายการที่เลือก</span>
                <p className="text-sm font-bold text-slate-800">{selectedQtyItem.name}</p>
                {selectedQtyItem.specs && <p className="text-xs text-slate-500">สเปก: {selectedQtyItem.specs}</p>}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
                  <span className="text-xs text-slate-500">ยอดจำนวนคงคลังขณะนี้:</span>
                  <span className="text-sm font-black text-slate-800">{selectedQtyItem.quantity || 1} ชิ้น</span>
                </div>
              </div>

              {/* เลือกประเภทการทำรายการ */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500">ประเภทการดำเนินการ</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setQtyAction('use'); setQtyValue(1); }}
                    className={`py-2 px-1 text-center text-xs font-bold border rounded-xl transition-all ${qtyAction === 'use' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    เบิกไปใช้งาน
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQtyAction('dispose'); setQtyValue(1); }}
                    className={`py-2 px-1 text-center text-xs font-bold border rounded-xl transition-all ${qtyAction === 'dispose' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    แทงจำหน่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => { setQtyAction('adjust'); setQtyValue(parseInt(selectedQtyItem.quantity) || 1); }}
                    className={`py-2 px-1 text-center text-xs font-bold border rounded-xl transition-all ${qtyAction === 'adjust' ? 'bg-slate-100 border-slate-500 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    ปรับยอดสต๊อก
                  </button>
                </div>
              </div>

              {/* ป้อนจำนวนชิ้นที่ต้องการโยกย้าย */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {qtyAction === 'use' && 'จำนวนที่ต้องการเบิกใช้งาน'}
                    {qtyAction === 'dispose' && 'จำนวนที่ชำรุดเสียหาย / สั่งทำลาย'}
                    {qtyAction === 'adjust' && 'แก้ไขยอดสต๊อกโดยตรงเป็นจำนวน'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={qtyAction !== 'adjust' ? (selectedQtyItem.quantity || 1) : undefined}
                    value={qtyValue}
                    onChange={e => setQtyValue(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-bold"
                  />
                </div>
              </div>

              {/* ช่องระบุผู้รับ / แผนก ในกรณีเบิกไปติดตั้งใช้งาน */}
              {qtyAction === 'use' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-550 mb-1">ชื่อผู้เบิก / แผนกที่นำไปติดตั้งใช้งานจริง</label>
                  <input
                    required
                    type="text"
                    value={qtyRecipient}
                    onChange={e => setQtyRecipient(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm"
                    placeholder="เช่น แผนกฉุกเฉิน (ER), นายสมรักษ์"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManageQtyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? 'กำลังหักยอด...' : 'ยืนยันทำรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Indicator แบบ Global */}
      {loading && !isModalOpen && !isManageQtyModalOpen && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white px-4 py-3 rounded-2xl shadow-xl text-sm flex items-center gap-2 z-50 transition-all">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="font-semibold">กำลังดำเนินการซิงก์ข้อมูล...</span>
        </div>
      )}
    </div>
  );
}
