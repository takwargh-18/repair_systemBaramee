import React, { useState, useEffect } from 'react';
import { 
  Monitor, Laptop, Cpu, Printer, Server, 
  Plus, Edit3, Trash2, Search, Activity,
  AlertCircle, CheckCircle2, XCircle, HardDrive
} from 'lucide-react';

// นำ URL ที่ได้จาก Google Apps Script (Deploy as Web App) มาใส่ที่นี่
const GAS_URL = "https://script.google.com/macros/s/AKfycbxhsIVIDTXAV0agoOLI3KDOuXPUx2Gy6EBmMRpn2cPIq38gPkxJmFZ_Ag5EXCqslViOyQ/exec";  

export default function App() {
  const [equipment, setEquipment] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'คอมพิวเตอร์',
    serial: '',
    status: 'ใช้งานปกติ',
    owner: ''
  });

  // โหลดข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    if (!GAS_URL) return; 
    setLoading(true);
    try {
      const response = await fetch(GAS_URL);
      const result = await response.json();
      if (result.status === 'success') {
        setEquipment(result.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const isEditing = !!editingItem;
    const payload = {
      id: isEditing ? editingItem.id : crypto.randomUUID(),
      ...formData
    };

    // จำลองการอัปเดตแบบ Local ให้แสดงผลทันที (Optimistic UI)
    if (isEditing) {
      setEquipment(prev => prev.map(item => item.id === payload.id ? payload : item));
    } else {
      setEquipment(prev => [...prev, payload]);
    }

    // ส่งข้อมูลไป Google Apps Script ถ้ามีการใส่ URL ไว้
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
      }
    }
    
    setLoading(false);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลครุภัณฑ์นี้ใช่หรือไม่?')) return;
    
    setLoading(true);
    // อัปเดต Local State ทันที
    setEquipment(prev => prev.filter(item => item.id !== id));

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            data: { id }
          })
        });
      } catch (error) {
        console.error("Error deleting data:", error);
      }
    }
    setLoading(false);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        serial: item.serial,
        status: item.status,
        owner: item.owner
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', category: 'คอมพิวเตอร์', serial: '', status: 'ใช้งานปกติ', owner: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // กรองข้อมูลตามคำค้นหา
  const filteredEquipment = equipment.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ตัวช่วยแสดงไอคอนและสีตามหมวดหมู่
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'คอมพิวเตอร์': return <Laptop className="w-5 h-5 text-indigo-400" />;
      case 'จอมอนิเตอร์': return <Monitor className="w-5 h-5 text-sky-400" />;
      case 'เครื่องพิมพ์': return <Printer className="w-5 h-5 text-fuchsia-400" />;
      case 'เซิร์ฟเวอร์': return <Server className="w-5 h-5 text-violet-400" />;
      default: return <HardDrive className="w-5 h-5 text-gray-400" />;
    }
  };

  // ตัวช่วยแสดงป้ายสถานะ
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ใช้งานปกติ':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> ปกติ</span>;
      case 'ส่งซ่อม':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertCircle className="w-3.5 h-3.5" /> ส่งซ่อม</span>;
      case 'แทงจำหน่าย':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> จำหน่าย</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Cpu className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">IT Asset<span className="text-indigo-400">Hub</span></h1>
              <p className="text-xs text-slate-400">ระบบจัดการครุภัณฑ์คอมพิวเตอร์</p>
            </div>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/25 font-medium text-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> ลงทะเบียนครุภัณฑ์
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Search & Stats Area */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อผู้ถือครอง, S/N หรือชื่ออุปกรณ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm placeholder-slate-500"
            />
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-700/30">
               <Activity className="w-4 h-4 text-indigo-400" />
               <span className="text-sm font-medium text-slate-300">ทั้งหมด <span className="text-white font-bold ml-1">{equipment.length}</span></span>
            </div>
          </div>
        </div>

        {/* Data List (Card / Table style) */}
        <div className="bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm shadow-xl">
          {equipment.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <HardDrive className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">ยังไม่มีข้อมูลครุภัณฑ์</h3>
              <p className="text-sm text-slate-400 mb-6">คลิกปุ่มลงทะเบียนด้านบนเพื่อเพิ่มอุปกรณ์ชิ้นแรกของคุณเข้าสู่ระบบ</p>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูลที่ค้นหา</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800/50 border-b border-white/5 text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">อุปกรณ์</th>
                    <th className="px-6 py-4">Serial Number</th>
                    <th className="px-6 py-4">หมวดหมู่</th>
                    <th className="px-6 py-4">ผู้ถือครอง</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEquipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                            {getCategoryIcon(item.category)}
                          </div>
                          <span className="font-medium text-slate-200">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{item.serial || '-'}</td>
                      <td className="px-6 py-4 text-slate-300">{item.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                            {item.owner ? item.owner.charAt(0) : '?'}
                          </div>
                          <span>{item.owner || 'ไม่มีผู้ถือครอง'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(item)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
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
      </main>

      {/* Modal เพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700 shadow-2xl rounded-2xl overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? 'แก้ไขข้อมูลครุภัณฑ์' : 'ลงทะเบียนครุภัณฑ์ใหม่'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">ชื่ออุปกรณ์ / รุ่น</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="เช่น Dell Optiplex 7090, จอ 24 นิ้ว"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">หมวดหมู่</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                  >
                    <option>คอมพิวเตอร์</option>
                    <option>จอมอนิเตอร์</option>
                    <option>เครื่องพิมพ์</option>
                    <option>เซิร์ฟเวอร์</option>
                    <option>อุปกรณ์เครือข่าย</option>
                    <option>อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Serial Number</label>
                  <input 
                    type="text" 
                    value={formData.serial}
                    onChange={e => setFormData({...formData, serial: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="S/N..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">ผู้ถือครอง (แผนก/บุคคล)</label>
                  <input 
                    type="text" 
                    value={formData.owner}
                    onChange={e => setFormData({...formData, owner: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="เช่น ฝ่ายไอที, สมชาย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">สถานะ</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                  >
                    <option>ใช้งานปกติ</option>
                    <option>ส่งซ่อม</option>
                    <option>แทงจำหน่าย</option>
                    <option>สำรอง</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay Global (Optional) */}
      {loading && !isModalOpen && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-pulse z-50">
          <Activity className="w-4 h-4" /> กำลังประมวลผล...
        </div>
      )}
    </div>
  );
}

```

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'คอมพิวเตอร์',
    serial: '',
    status: 'ใช้งานปกติ',
    owner: ''
  });

  // โหลดข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!GAS_URL) return; // ถ้ายังไม่ได้ใส่ URL ให้ทำงานแบบ Local ไปก่อน
    setLoading(true);
    try {
      const response = await fetch(GAS_URL);
      const result = await response.json();
      if (result.status === 'success') {
        setEquipment(result.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const isEditing = !!editingItem;
    const payload = {
      id: isEditing ? editingItem.id : crypto.randomUUID(),
      ...formData
    };

    // จำลองการอัปเดตแบบ Local ให้แสดงผลทันที (Optimistic UI)
    if (isEditing) {
      setEquipment(prev => prev.map(item => item.id === payload.id ? payload : item));
    } else {
      setEquipment(prev => [...prev, payload]);
    }

    // ส่งข้อมูลไป Google Apps Script ถ้ามีการใส่ URL ไว้
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
      }
    }
    
    setLoading(false);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลครุภัณฑ์นี้ใช่หรือไม่?')) return;
    
    setLoading(true);
    // อัปเดต Local State ทันที
    setEquipment(prev => prev.filter(item => item.id !== id));

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            data: { id }
          })
        });
      } catch (error) {
        console.error("Error deleting data:", error);
      }
    }
    setLoading(false);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        serial: item.serial,
        status: item.status,
        owner: item.owner
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', category: 'คอมพิวเตอร์', serial: '', status: 'ใช้งานปกติ', owner: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // กรองข้อมูลตามคำค้นหา
  const filteredEquipment = equipment.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.owner?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ตัวช่วยแสดงไอคอนและสีตามหมวดหมู่
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'คอมพิวเตอร์': return <Laptop className="w-5 h-5 text-indigo-400" />;
      case 'จอมอนิเตอร์': return <Monitor className="w-5 h-5 text-sky-400" />;
      case 'เครื่องพิมพ์': return <Printer className="w-5 h-5 text-fuchsia-400" />;
      case 'เซิร์ฟเวอร์': return <Server className="w-5 h-5 text-violet-400" />;
      default: return <HardDrive className="w-5 h-5 text-gray-400" />;
    }
  };

  // ตัวช่วยแสดงป้ายสถานะ
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ใช้งานปกติ':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> ปกติ</span>;
      case 'ส่งซ่อม':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertCircle className="w-3.5 h-3.5" /> ส่งซ่อม</span>;
      case 'แทงจำหน่าย':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> จำหน่าย</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Cpu className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">IT Asset<span className="text-indigo-400">Hub</span></h1>
              <p className="text-xs text-slate-400">ระบบจัดการครุภัณฑ์คอมพิวเตอร์</p>
            </div>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/25 font-medium text-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> ลงทะเบียนครุภัณฑ์
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Search & Stats Area */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อผู้ถือครอง, S/N หรือชื่ออุปกรณ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm placeholder-slate-500"
            />
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-700/30">
               <Activity className="w-4 h-4 text-indigo-400" />
               <span className="text-sm font-medium text-slate-300">ทั้งหมด <span className="text-white font-bold ml-1">{equipment.length}</span></span>
            </div>
          </div>
        </div>

        {/* Data List (Card / Table style) */}
        <div className="bg-slate-800/30 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm shadow-xl">
          {equipment.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                <HardDrive className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">ยังไม่มีข้อมูลครุภัณฑ์</h3>
              <p className="text-sm text-slate-400 mb-6">คลิกปุ่มลงทะเบียนด้านบนเพื่อเพิ่มอุปกรณ์ชิ้นแรกของคุณเข้าสู่ระบบ</p>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูลที่ค้นหา</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800/50 border-b border-white/5 text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">อุปกรณ์</th>
                    <th className="px-6 py-4">Serial Number</th>
                    <th className="px-6 py-4">หมวดหมู่</th>
                    <th className="px-6 py-4">ผู้ถือครอง</th>
                    <th className="px-6 py-4">สถานะ</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEquipment.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                            {getCategoryIcon(item.category)}
                          </div>
                          <span className="font-medium text-slate-200">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{item.serial || '-'}</td>
                      <td className="px-6 py-4 text-slate-300">{item.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                            {item.owner ? item.owner.charAt(0) : '?'}
                          </div>
                          <span>{item.owner || 'ไม่มีผู้ถือครอง'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal(item)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
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
      </main>

      {/* Modal เพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700 shadow-2xl rounded-2xl overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? 'แก้ไขข้อมูลครุภัณฑ์' : 'ลงทะเบียนครุภัณฑ์ใหม่'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">ชื่ออุปกรณ์ / รุ่น</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="เช่น Dell Optiplex 7090, จอ 24 นิ้ว"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">หมวดหมู่</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                  >
                    <option>คอมพิวเตอร์</option>
                    <option>จอมอนิเตอร์</option>
                    <option>เครื่องพิมพ์</option>
                    <option>เซิร์ฟเวอร์</option>
                    <option>อุปกรณ์เครือข่าย</option>
                    <option>อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Serial Number</label>
                  <input 
                    type="text" 
                    value={formData.serial}
                    onChange={e => setFormData({...formData, serial: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="S/N..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">ผู้ถือครอง (แผนก/บุคคล)</label>
                  <input 
                    type="text" 
                    value={formData.owner}
                    onChange={e => setFormData({...formData, owner: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="เช่น ฝ่ายไอที, สมชาย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">สถานะ</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                  >
                    <option>ใช้งานปกติ</option>
                    <option>ส่งซ่อม</option>
                    <option>แทงจำหน่าย</option>
                    <option>สำรอง</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading Overlay Global (Optional) */}
      {loading && !isModalOpen && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-pulse z-50">
          <Activity className="w-4 h-4" /> กำลังประมวลผล...
        </div>
      )}
    </div>
  );
}
