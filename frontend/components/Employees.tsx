import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Barcode, 
  X, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  Check,
  UserCheck
} from 'lucide-react';
import { Employee, User as UserType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/src/services/api';

const ITEMS_PER_PAGE = 10;

const PRESET_AVATARS = [
  { id: 'av1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', label: 'Tech Lead' },
  { id: 'av2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', label: 'Senior Cashier' },
  { id: 'av3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80', label: 'Manager' },
  { id: 'av4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', label: 'Support Operator' },
];

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Sub tab selection
  const [subTab, setSubTab] = useState<'employees' | 'cashiers'>('employees');

  // Cashier User list and loading states
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // New Cashier states
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'cashier'>('cashier');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Reset Password states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Register Form states
  const [newCode, setNewCode] = useState('HQG-BLHT-T001');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('20'); // Default 20%
  const [newAvatarUrl, setNewAvatarUrl] = useState('');

  // Edit Form states
  const [selectedEmpCode, setSelectedEmpCode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Sound effects generator
  const playSound = (type: 'beep' | 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context block fallback
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data as any);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (subTab === 'cashiers') {
      fetchUsers();
    }
  }, [subTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUsername || !newUserPassword) {
      setError('Username and password are required.');
      playSound('error');
      return;
    }

    try {
      const cleanU = newUsername.trim().toLowerCase();
      const newUser = await api.createUser(cleanU, newUserPassword, newUserRole);

      playSound('success');
      setSuccess(`Operator "${newUser.username}" successfully registered.`);
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('cashier');
      setIsUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleDeleteUser = async (uname: string) => {
    if (uname === 'admin') {
      setError('Cannot delete the master admin account.');
      playSound('error');
      return;
    }

    if (!confirm(`Are you sure you want to completely remove operator account: ${uname}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    playSound('beep');

    try {
      await api.deleteUser(uname);

      playSound('success');
      setSuccess(`Operator ${uname} successfully removed.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetNewPassword) return;

    setError(null);
    setSuccess(null);

    try {
      await api.updateUserPassword(resetTargetUser, resetNewPassword);

      playSound('success');
      setSuccess(`Password for ${resetTargetUser} has been successfully updated.`);
      setResetNewPassword('');
      setIsResetModalOpen(false);
      setResetTargetUser(null);
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newCode || !newName || !newRate) {
      setError('Employee name, unique badge code, and discount rate are required.');
      playSound('error');
      return;
    }

    const codeUpper = newCode.trim().toUpperCase();
    if (!codeUpper.startsWith('HQG-BLHT-T001')) {
      setError('Employee Badge ID must start with "HQG-BLHT-T001".');
      playSound('error');
      return;
    }

    const rateDec = parseFloat(newRate) / 100;
    if (isNaN(rateDec) || rateDec < 0 || rateDec > 1) {
      setError('Discount rate must be a valid percentage between 0% and 100%.');
      playSound('error');
      return;
    }

    try {
      const empPayload = {
        employee_code: codeUpper,
        employee_name: newName.trim(),
        discount_rate: rateDec,
        avatar_url: newAvatarUrl.trim()
      };
      await api.createEmployee(empPayload);

      playSound('success');
      setSuccess(`Employee "${empPayload.employee_name}" successfully registered.`);
      setNewCode('HQG-BLHT-T001');
      setNewName('');
      setNewRate('20');
      setNewAvatarUrl('');
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleDeleteEmployee = async (code: string) => {
    if (!confirm(`Are you absolutely sure you want to delete employee record with badge: ${code}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    playSound('beep');

    try {
      await api.deleteEmployee(code);

      playSound('success');
      setSuccess(`Employee ${code} successfully removed.`);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleStartEdit = (emp: Employee) => {
    playSound('beep');
    setSelectedEmpCode(emp.employee_code);
    setEditName(emp.employee_name);
    setEditRate((emp.discount_rate * 100).toFixed(0));
    setEditAvatarUrl(emp.avatar_url || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpCode) return;
    setError(null);
    setSuccess(null);

    if (!editName || !editRate) {
      setError('All fields are required to update employee information.');
      playSound('error');
      return;
    }

    const rateDec = parseFloat(editRate) / 100;
    if (isNaN(rateDec) || rateDec < 0 || rateDec > 1) {
      setError('Discount rate must be a valid percentage between 0% and 100%.');
      playSound('error');
      return;
    }

    try {
      const empPayload = {
        employee_name: editName.trim(),
        discount_rate: rateDec,
        avatar_url: editAvatarUrl.trim()
      };
      await api.updateEmployee(selectedEmpCode, empPayload);

      playSound('success');
      setSuccess(`Employee "${selectedEmpCode}" updated successfully.`);
      setIsEditModalOpen(false);
      setSelectedEmpCode(null);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  // Helper to extract clean initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  // Determine a stable rich gradient background based on initials for visual rhythm
  const getAvatarGradientClass = (initials: string) => {
    const sum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
    const index = sum % 4;
    switch (index) {
      case 0: return 'from-amber-500 to-orange-600 text-amber-50';
      case 1: return 'from-orange-500 to-red-600 text-orange-50';
      case 2: return 'from-yellow-500 to-amber-600 text-yellow-50';
      default: return 'from-amber-600 to-yellow-600 text-amber-100';
    }
  };

  // Safe Avatar image wrapper with immediate local state error recovery
  const AvatarCell = ({ emp }: { emp: Employee }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const initials = getInitials(emp.employee_name);
    const gradient = getAvatarGradientClass(initials);

    if (emp.avatar_url && !imgFailed) {
      return (
        <div className="relative h-10 w-10 rounded-full overflow-hidden shadow-inner border-2 border-[#B25712]/15 shrink-0 bg-slate-100 flex items-center justify-center">
          <img 
            src={emp.avatar_url} 
            alt={emp.employee_name} 
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    return (
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold font-sans tracking-tighter text-xs shrink-0 shadow border border-amber-200/10`}>
        {initials}
      </div>
    );
  };

  const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedEmployees = employees.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] overflow-y-auto font-sans h-[calc(100vh-4rem)] select-none">
      
      {/* Header Panel */}
      <div className="flex justify-between items-center mb-6 border-b border-amber-200/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#B25712]/10 border border-[#B25712]/20 p-2 rounded-xl">
            <Users2 className="w-6 h-6 text-[#B25712]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase leading-none tracking-wide">
              {subTab === 'employees' ? 'Employee Ledgers' : 'Operator Accounts'}
            </h1>
            <span className="text-xs text-slate-400 font-mono">
              {subTab === 'employees' 
                ? 'Register unique staff discount badges and visual avatars' 
                : 'Sole Admin Authority: Register and manage secure terminal operator login accounts'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playSound('beep');
              if (subTab === 'employees') {
                setIsModalOpen(true);
              } else {
                setIsUserModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 bg-[#CC9900] hover:bg-[#b38600] text-white text-xs px-4 py-2 rounded-lg font-black uppercase border border-[#B98B23] shadow-md transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            {subTab === 'employees' ? 'Register Staff' : 'Register Operator'}
          </button>
          <button
            onClick={() => {
              playSound('beep');
              if (subTab === 'employees') {
                fetchEmployees();
              } else {
                fetchUsers();
              }
            }}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-lg border border-slate-200 font-bold shadow-sm transition cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload DB
          </button>
        </div>
      </div>

      {/* Sub-tab Selectors */}
      <div className="flex gap-2 mb-6 border-b border-amber-200/30 pb-3">
        <button
          onClick={() => { playSound('beep'); setSubTab('employees'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            subTab === 'employees'
              ? 'bg-[#B25712] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Staff Discount Badges
        </button>
        <button
          onClick={() => { playSound('beep'); setSubTab('cashiers'); }}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            subTab === 'cashiers'
              ? 'bg-[#B25712] text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Operator / Cashier Accounts
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6 flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-fadeIn">
          <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-lg mb-6 flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-fadeIn">
          <AlertCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Database List view */}
      {subTab === 'employees' ? (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#B25712] text-[10px] uppercase font-bold tracking-wider h-11 border-b border-amber-100/30 text-white font-mono">
                  <th className="px-4 py-2 w-12 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                  <th className="px-4 py-2 w-44 text-white border-r border-[#B25712]/10 pl-4">Badge ID Code</th>
                  <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">Staff Member</th>
                  <th className="px-4 py-2 w-44 text-center text-white border-r border-[#B25712]/10">Discount Claim Tier</th>
                  <th className="px-4 py-2 w-28 text-center text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/40 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      Querying database files...
                    </td>
                  </tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      No registered staff records in database.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp, idx) => {
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        key={emp.employee_code} 
                        className="hover:bg-[#FEF7E5]/50 transition h-14 text-[#2F2F2F] font-semibold text-xs border-b border-amber-100/30"
                      >
                        <td className="px-4 py-2 text-center text-slate-400 font-sans font-mono">{(activePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 font-mono font-bold text-[#B25712]">{emp.employee_code}</td>
                        <td className="px-4 py-2 font-sans text-slate-900 font-bold">
                          <div className="flex items-center gap-3">
                            <AvatarCell emp={emp} />
                            <div>
                              <span className="font-extrabold text-[#2F2F2F] text-xs block">{emp.employee_name}</span>
                              <span className="text-[9px] text-slate-400 font-mono tracking-wider font-semibold block uppercase">STAFF CO-PARTNER</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-block whitespace-nowrap bg-[#FEF7E5] text-[#B25712] px-2.5 py-1 rounded-md font-black font-sans text-[10px] border border-amber-150">
                            {(emp.discount_rate * 100).toFixed(0)}% automatic Discount
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-sans">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(emp)}
                              className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                              title="Edit staff record in popup"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.employee_code)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Delete staff record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {employees.length > 0 && (
            <div className="bg-slate-50 border-t border-amber-100/30 px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="text-slate-500 font-sans">
                Showing <span className="font-semibold text-slate-700">{(activePage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(activePage * ITEMS_PER_PAGE, employees.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{employees.length}</span> records
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { playSound('beep'); setCurrentPage((prev) => Math.max(prev - 1, 1)); }}
                  disabled={activePage === 1}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => { playSound('beep'); setCurrentPage(pNum); }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      activePage === pNum
                        ? 'bg-[#B25712] text-white font-black'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { playSound('beep'); setCurrentPage((prev) => Math.min(prev + 1, totalPages)); }}
                  disabled={activePage === totalPages}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#B25712] text-[10px] uppercase font-bold tracking-wider h-11 border-b border-amber-100/30 text-white font-mono">
                  <th className="px-4 py-2 w-12 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                  <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">Operator Username</th>
                  <th className="px-4 py-2 w-44 text-center text-white border-r border-[#B25712]/10">Account Role</th>
                  <th className="px-4 py-2 w-56 text-center text-white border-r border-[#B25712]/10">Security Key Status</th>
                  <th className="px-4 py-2 w-44 text-center text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/40 bg-white">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      Querying database files...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      No operator accounts in database.
                    </td>
                  </tr>
                ) : (
                  users.map((usr, idx) => {
                    const isMasterAdmin = usr.username === 'admin';
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        key={usr.username} 
                        className="hover:bg-[#FEF7E5]/50 transition h-14 text-[#2F2F2F] font-semibold text-xs border-b border-amber-100/30"
                      >
                        <td className="px-4 py-2 text-center text-slate-400 font-sans font-mono">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono font-bold text-[#B25712] pl-4">{usr.username}</td>
                        <td className="px-4 py-2 text-center font-sans">
                          <span className={`inline-block px-2.5 py-1 rounded-md font-black text-[10px] uppercase ${
                            usr.role === 'admin' 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-md font-sans text-[10px] ${
                            isMasterAdmin 
                              ? 'bg-[#FEF7E5] text-[#B25712] font-black border border-amber-150'
                              : 'bg-slate-50 text-slate-600 font-semibold border border-slate-200'
                          }`}>
                            {isMasterAdmin ? 'Built-in Master Admin' : 'Secure Cashier Password'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-sans">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => {
                                playSound('beep');
                                setResetTargetUser(usr.username);
                                setIsResetModalOpen(true);
                              }}
                              className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer font-bold text-[10px] uppercase flex items-center gap-1"
                              title="Reset security password / pin"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reset Key
                            </button>
                            {!isMasterAdmin && (
                              <button
                                onClick={() => handleDeleteUser(usr.username)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer font-bold text-[10px] uppercase flex items-center gap-1"
                                title="Remove cashier account"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Register Employee Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8"
            >
              <button
                onClick={() => {
                  playSound('beep');
                  setIsModalOpen(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#B25712]" />
                Register Staff Member
              </h2>
              
              <form onSubmit={handleAddEmployee} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Badge ID Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. HQG-BLHT-T001"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition uppercase placeholder-slate-400"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    Type badge code starting with HQG-BLHT-T001. Will be matched in checking.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Employee Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Dorji Wangchuk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Automatic Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none font-bold text-slate-400 font-mono">
                      %
                    </div>
                  </div>
                </div>

                {/* Profile Portrait / Avatar Selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                    <span>Staff Portrait Avatar</span>
                    <span className="text-[9px] text-emerald-600 font-mono font-bold lowercase tracking-normal">with live preview</span>
                  </label>
                  
                  {/* Preset Selector */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESET_AVATARS.map((av) => {
                      const isSelected = newAvatarUrl === av.url;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => { playSound('beep'); setNewAvatarUrl(av.url); }}
                          className={`relative h-11 w-11 rounded-xl overflow-hidden border-2 cursor-pointer transition-all mx-auto ${
                            isSelected ? 'border-[#CC9900] scale-105 shadow-md ring-2 ring-[#CC9900]/20' : 'border-slate-200 hover:border-slate-300'
                          }`}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} className="h-full w-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#CC9900]/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white stroke-[4px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual input */}
                  <div className="relative">
                    <input
                      type="url"
                      value={newAvatarUrl}
                      onChange={(e) => setNewAvatarUrl(e.target.value)}
                      placeholder="Or paste custom image URL..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-[10px] transition placeholder-slate-400"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('beep');
                      setIsModalOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#CC9900] hover:brightness-95 active:scale-[0.98] border border-[#B98B23] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Register Staff
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit Employee Details Popup */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8"
            >
              <button
                onClick={() => {
                  playSound('beep');
                  setIsEditModalOpen(false);
                  setSelectedEmpCode(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#B25712]" />
                Modify Staff Record
              </h2>
              
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Badge ID Code (Read Only)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedEmpCode || ''}
                      disabled
                      className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold cursor-not-allowed uppercase"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Employee Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Dorji Wangchuk"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Automatic Discount (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      placeholder="20"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none font-bold text-slate-400 font-mono">
                      %
                    </div>
                  </div>
                </div>

                {/* Profile Portrait / Avatar Selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                    <span>Staff Portrait Avatar</span>
                    <span className="text-[9px] text-emerald-600 font-mono font-bold lowercase tracking-normal">with live preview</span>
                  </label>
                  
                  {/* Preset Selector */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESET_AVATARS.map((av) => {
                      const isSelected = editAvatarUrl === av.url;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => { playSound('beep'); setEditAvatarUrl(av.url); }}
                          className={`relative h-11 w-11 rounded-xl overflow-hidden border-2 cursor-pointer transition-all mx-auto ${
                            isSelected ? 'border-[#CC9900] scale-105 shadow-md ring-2 ring-[#CC9900]/20' : 'border-slate-200 hover:border-slate-300'
                          }`}
                          title={av.label}
                        >
                          <img src={av.url} alt={av.label} className="h-full w-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#CC9900]/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white stroke-[4px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual input */}
                  <div className="relative">
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="Or paste custom image URL..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-[10px] transition placeholder-slate-400"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('beep');
                      setIsEditModalOpen(false);
                      setSelectedEmpCode(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#B25712] hover:brightness-95 active:scale-[0.98] border border-[#B25712] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Register Cashier/User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8"
            >
              <button
                onClick={() => {
                  playSound('beep');
                  setIsUserModalOpen(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2 font-sans">
                <Plus className="w-5 h-5 text-[#B25712]" />
                Register Operator / Cashier
              </h2>
              
              <form onSubmit={handleAddUser} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Operator Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. cashier_thimphu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Operator Secure Password
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'cashier')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                  >
                    <option value="cashier">Cashier (Standard operator checkout access)</option>
                    <option value="admin">Admin (Full administrative & ledger access)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('beep');
                      setIsUserModalOpen(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#CC9900] hover:brightness-95 active:scale-[0.98] border border-[#B98B23] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Register Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Reset Cashier/User Password Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8"
            >
              <button
                onClick={() => {
                  playSound('beep');
                  setIsResetModalOpen(false);
                  setResetTargetUser(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2 font-sans">
                <RefreshCw className="w-4 h-4 text-[#B25712]" />
                Reset Key: {resetTargetUser}
              </h2>
              
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    New Security Pin / Password
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                    required
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    Type a new strong pin or password. Credentials are hashed server-side.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('beep');
                      setIsResetModalOpen(false);
                      setResetTargetUser(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#B25712] hover:brightness-95 active:scale-[0.98] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                    Reset Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
