import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  Users, 
  Search, 
  Filter, 
  CheckCircle2,
  Clock,
  Calendar,
  BookOpen,
  FileText,
  CreditCard,
  LogOut,
  XCircle,
  Trash2,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, secureFetch } from '../../config/api';
import toast from 'react-hot-toast';
import { sanitizeQueryParam, handleSessionExpiration } from '../../utils/security';
import Skeleton from '../../components/Skeleton';
import ConfirmModal from '../../components/ConfirmModal';
import { Pagination } from '../../components/ui';
import ResultsTab from './ResultsTab';
import PYQSTab from './PYQSTab';
import SyllabusTab from './SyllabusTab';
import SettingsTab from './SettingsTab';
import GalleryTab from './GalleryTab';
import { Image as ImageIcon } from 'lucide-react';

const PRIMARY_BLUE = '#007BFF';
const HEADING_COL  = '#1F2937';
const MUTED_COL    = '#9CA3AF';
const BORDER_COL   = '#E5E7EB';
const BG_SECTION   = '#F9FAFB';
const SCHOOLS_PER_PAGE = 25;
const ICON_BG      = '#EFF6FF';
const ICON_COL     = '#1D4ED8';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'overview');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: () => {},
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('adminActiveTab', tab);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Data states
  const [stats, setStats] = useState({ totalSchools: 0, totalStudents: 0, pendingApprovals: 0, verifiedSchools: 0, pendingPayments: 0 });
  const [schools, setSchools] = useState([]);
  const [schoolsPage, setSchoolsPage] = useState({ page: 1, limit: SCHOOLS_PER_PAGE, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [error, setError] = useState('');

  /**
   * Narrowing the list must return to page 1 — otherwise a filter that yields
   * two pages leaves the table sitting on page 5 with nothing to show.
   *
   * Done here in the handlers rather than in an effect on [searchTerm,
   * statusFilter]: an effect would fire a request for the old page first and
   * then immediately fire a second one for page 1.
   */
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setShowFilterDropdown(false);
    setPage(1);
  };

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await secureFetch(`${API_BASE_URL}/api/admin/stats`);
      if (!res.ok) {
        if (handleSessionExpiration(res, navigate)) return;
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [navigate]);

  /**
   * Builds the schools query.
   *
   * `page` and `limit` were previously omitted entirely, so the table showed
   * the server's first 50 rows and ignored `total` — with more than 50 schools
   * the rest could not be reached or approved from the dashboard at all.
   */
  const schoolsQuery = useCallback(() => {
    const params = new URLSearchParams();
    const sanitized = sanitizeQueryParam(searchTerm);
    if (sanitized) params.set('search', sanitized);
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', String(page));
    params.set('limit', String(SCHOOLS_PER_PAGE));
    return params.toString();
  }, [searchTerm, statusFilter, page]);

  // Fetch schools list. Also used to refresh after an approve/reject/delete.
  const fetchSchools = useCallback(async () => {
    try {
      const res = await secureFetch(`${API_BASE_URL}/api/admin/schools?${schoolsQuery()}`);
      if (!res.ok) {
        if (handleSessionExpiration(res, navigate)) return;
        throw new Error('Failed to fetch schools');
      }
      const data = await res.json();
      setSchools(data.schools || []);
      setSchoolsPage({
        page: data.page ?? 1,
        limit: data.limit ?? SCHOOLS_PER_PAGE,
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 1,
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSchools(false);
    }
  }, [schoolsQuery, navigate]);

  useEffect(() => {
    let active = true;
    secureFetch(`${API_BASE_URL}/api/admin/stats`)
      .then(async (res) => {
        if (!res.ok) {
          if (handleSessionExpiration(res, navigate)) return;
          throw new Error('Failed to fetch stats');
        }
        const data = await res.json();
        if (active) setStats(data);
      })
      .catch((err) => console.error('Stats error:', err))
      .finally(() => { if (active) setLoadingStats(false); });

    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const query = schoolsQuery();

    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(() => {
      secureFetch(`${API_BASE_URL}/api/admin/schools?${query}`)
        .then(async (res) => {
          if (!res.ok) {
            if (handleSessionExpiration(res, navigate)) return;
            throw new Error('Failed to fetch schools');
          }
          const data = await res.json();
          if (!active) return;
          setSchools(data.schools || []);
          setSchoolsPage({
            page: data.page ?? 1,
            limit: data.limit ?? SCHOOLS_PER_PAGE,
            total: data.total ?? 0,
            totalPages: data.totalPages ?? 1,
          });
          setError('');
        })
        .catch((err) => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoadingSchools(false); });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [schoolsQuery, navigate]);

  // Handle school status update
  const handleStatusUpdate = (schoolId, newStatus) => {
    setConfirmModal({
      isOpen: true,
      title: `${newStatus === 'APPROVED' ? 'Approve' : 'Reject'} School`,
      message: `Are you sure you want to ${newStatus.toLowerCase()} this school?`,
      confirmText: newStatus === 'APPROVED' ? 'Approve' : 'Reject',
      confirmVariant: newStatus === 'APPROVED' ? 'success' : 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await secureFetch(`${API_BASE_URL}/api/admin/schools/${schoolId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus }),
          });

          if (res.ok) {
            toast.success(`School status updated to ${newStatus}`);
            fetchStats();
            fetchSchools();
          } else {
            toast.error(`Failed to ${newStatus.toLowerCase()} school`);
          }
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  };

  // Handle school deletion
  const handleDeleteSchool = (schoolId, schoolName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete School',
      message: `Are you sure you want to delete "${schoolName}" and all its data? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await secureFetch(`${API_BASE_URL}/api/admin/schools/${schoolId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            toast.success('School deleted successfully');
            fetchStats();
            fetchSchools();
          } else {
            toast.error('Failed to delete school');
          }
        } catch (err) {
          toast.error(err.message);
        }
      },
    });
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard – NTI Olympiad</title>
      </Helmet>

      <div className="flex min-h-screen bg-[#F8FAFC] text-left">
        
        {/* Left Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-white border-r hidden md:flex flex-col z-10" style={{ borderColor: BORDER_COL }}>
          <div className="p-6 border-b" style={{ borderColor: BORDER_COL }}>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={20} style={{ color: ICON_COL }} strokeWidth={2.5} />
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: HEADING_COL }}>Admin Panel</h2>
            </div>
            <p className="text-[11px] font-bold mt-1 uppercase tracking-widest" style={{ color: PRIMARY_BLUE }}>NTI Olympiad</p>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
            <button 
              onClick={() => handleTabChange('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'overview' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <Building2 size={16} strokeWidth={2.5} /> Overview
            </button>
            <button 
              onClick={() => navigate('/admin/approvals')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors border border-transparent"
            >
              <CreditCard size={16} strokeWidth={2} /> Approvals
            </button>

            <button 
              onClick={() => handleTabChange('results')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'results' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <FileText size={16} strokeWidth={2.5} /> Results
            </button>
            <button 
              onClick={() => handleTabChange('pyqs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'pyqs' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <BookOpen size={16} strokeWidth={2.5} /> Previous Papers
            </button>
            <button 
              onClick={() => handleTabChange('syllabus')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'syllabus' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <Calendar size={16} strokeWidth={2.5} /> Syllabus
            </button>
            <button 
              onClick={() => handleTabChange('gallery')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'gallery' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <ImageIcon size={16} strokeWidth={2.5} /> Gallery
            </button>
            <button 
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-bold transition-colors ${activeTab === 'settings' ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            >
              <Filter size={16} strokeWidth={2.5} /> Settings
            </button>
          </nav>

          {/* Logout at bottom */}
          <div className="p-4 border-t" style={{ borderColor: BORDER_COL }}>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors border border-transparent"
            >
              <LogOut size={16} strokeWidth={2} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto w-full">

          {/* Mobile header with logout */}
          <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: BORDER_COL }}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: ICON_COL }} strokeWidth={2.5} />
              <span className="text-sm font-bold" style={{ color: HEADING_COL }}>Admin Panel</span>
            </div>
            <button onClick={handleLogout} className="text-red-600 text-xs font-semibold flex items-center gap-1">
              <LogOut size={14} /> Logout
            </button>
          </div>

          {/* Mobile tab bar */}
          <div className="md:hidden bg-white border-b px-2 py-2 flex gap-1 overflow-x-auto" style={{ borderColor: BORDER_COL }}>
            {[
              { key: 'overview', label: 'Overview', icon: Building2 },
              { key: 'approvals', label: 'Approvals', icon: CreditCard },
              { key: 'results', label: 'Results', icon: FileText },
              { key: 'pyqs', label: 'Previous Papers', icon: BookOpen },
              { key: 'syllabus', label: 'Syllabus', icon: Calendar },
              { key: 'gallery', label: 'Gallery', icon: ImageIcon },
              { key: 'settings', label: 'Settings', icon: Filter },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => tab.key === 'approvals' ? navigate('/admin/approvals') : handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-bold whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'text-gray-500'}`}
              >
                <tab.icon size={13} strokeWidth={2.5} /> {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="bg-white border-b px-8 py-6 flex items-center justify-between" style={{ borderColor: BORDER_COL }}>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: HEADING_COL }}>School Enrollments</h1>
                  <p className="text-sm mt-1" style={{ color: MUTED_COL }}>Monitor and manage registered schools and overall student participation counts.</p>
                </div>
                <button onClick={() => { fetchStats(); fetchSchools(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Refresh">
                  <RefreshCw size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="p-8 max-w-full">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-sm border p-5 flex items-center gap-4 transition-shadow hover:shadow-md" style={{ borderColor: BORDER_COL }}>
                    <Building2 size={26} style={{ color: '#6B7280' }} strokeWidth={1.5} className="flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Schools</p>
                      <h3 className="text-3xl font-bold" style={{ color: HEADING_COL, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {loadingStats ? <Skeleton width="60px" height="36px" borderRadius="8px" /> : stats.totalSchools}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-sm border p-5 flex items-center gap-4 transition-shadow hover:shadow-md" style={{ borderColor: BORDER_COL }}>
                    <Users size={26} style={{ color: '#6B7280' }} strokeWidth={1.5} className="flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Total Students</p>
                      <h3 className="text-3xl font-bold" style={{ color: HEADING_COL, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {loadingStats ? <Skeleton width="80px" height="36px" borderRadius="8px" /> : stats.totalStudents.toLocaleString()}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-sm border p-5 flex items-center gap-4 transition-shadow hover:shadow-md" style={{ borderColor: BORDER_COL }}>
                    <Clock size={26} style={{ color: '#F59E0B' }} strokeWidth={1.5} className="flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Pending Approvals</p>
                      <h3 className="text-3xl font-bold" style={{ color: HEADING_COL, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {loadingStats ? <Skeleton width="50px" height="36px" borderRadius="8px" /> : stats.pendingApprovals}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-sm border p-5 flex items-center gap-4 transition-shadow hover:shadow-md" style={{ borderColor: BORDER_COL }}>
                    <CheckCircle2 size={26} style={{ color: '#10B981' }} strokeWidth={1.5} className="flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Approved Schools</p>
                      <h3 className="text-3xl font-bold" style={{ color: HEADING_COL, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {loadingStats ? <Skeleton width="60px" height="36px" borderRadius="8px" /> : stats.verifiedSchools}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-sm border overflow-hidden" style={{ borderColor: BORDER_COL }}>
                  <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: BORDER_COL, background: BG_SECTION }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: ICON_BG }}>
                        <Users size={15} style={{ color: ICON_COL }} strokeWidth={2} />
                      </div>
                      <h2 className="text-lg font-bold" style={{ color: HEADING_COL }}>
                        Directory
                      </h2>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={15} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search by school name, email or username..."
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-[13px] border rounded-sm outline-none transition-colors border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-sm text-[13px] font-semibold hover:bg-gray-50 transition-colors bg-white ${statusFilter ? 'border-blue-400 text-blue-700' : 'border-gray-300 text-gray-700'}`}
                        >
                          <Filter size={15} /> {statusFilter || 'Filter'} <ChevronDown size={13} />
                        </button>
                        {showFilterDropdown && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-20 min-w-[150px]">
                            <button onClick={() => handleStatusFilterChange('')} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 font-medium text-gray-600">All</button>
                            <button onClick={() => handleStatusFilterChange('PENDING')} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 font-medium text-amber-700">Pending</button>
                            <button onClick={() => handleStatusFilterChange('APPROVED')} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 font-medium text-emerald-700">Approved</button>
                            <button onClick={() => handleStatusFilterChange('REJECTED')} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 font-medium text-red-700">Rejected</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {loadingSchools ? (
                    <div className="p-6 space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} width="100%" height="60px" borderRadius="8px" />
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-12 text-center">
                      <AlertCircle className="text-red-400 mx-auto mb-3" size={24} />
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="border-b bg-gray-50/50" style={{ borderColor: BORDER_COL }}>
                          <tr>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">School Details</th>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Coordinator</th>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Contact</th>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-right">Students</th>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-center">Status</th>
                            <th className="px-5 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-center border-l border-gray-200">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {schools.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-gray-500 text-[13px]">No schools found.</td>
                            </tr>
                          ) : schools.map((school) => (
                            <tr key={school.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-4">
                                <p className="text-[13px] font-bold text-gray-900">{school.schoolName}</p>
                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">ID: {school.id} · {school.username}</p>
                              </td>
                              <td className="px-5 py-4">
                                {school.coordinator ? (
                                  <>
                                    <p className="text-[13px] font-semibold text-gray-800">{school.coordinator.name}</p>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">{school.coordinator.designation}</p>
                                  </>
                                ) : (
                                  <span className="text-[12px] text-gray-400 italic">No coordinator</span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-[13px] font-medium text-gray-700">{school.email}</p>
                                {school.coordinator?.phone && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">{school.coordinator.phone}</p>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="text-[14px] font-bold text-gray-900">{school.studentCount.toLocaleString()}</span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                {school.status === 'APPROVED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={12} strokeWidth={2.5} /> Approved
                                  </span>
                                ) : school.status === 'REJECTED' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                    <XCircle size={12} strokeWidth={2.5} /> Rejected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={12} strokeWidth={2.5} /> Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 border-l border-gray-200">
                                <div className="flex items-center justify-center gap-1.5">
                                  {school.status === 'PENDING' && (
                                    <>
                                      <button
                                        onClick={() => handleStatusUpdate(school.id, 'APPROVED')}
                                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded text-[11px] font-medium hover:bg-emerald-700 transition"
                                        title="Approve"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleStatusUpdate(school.id, 'REJECTED')}
                                        className="px-2.5 py-1.5 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 transition"
                                        title="Reject"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSchool(school.id, school.schoolName)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete school"
                                  >
                                    <Trash2 size={14} strokeWidth={2} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <Pagination
                        page={schoolsPage.page}
                        totalPages={schoolsPage.totalPages}
                        total={schoolsPage.total}
                        limit={schoolsPage.limit}
                        onChange={setPage}
                        label="schools"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'results' && <ResultsTab />}
          {activeTab === 'pyqs' && <PYQSTab />}
          {activeTab === 'syllabus' && <SyllabusTab />}
          {activeTab === 'gallery' && <GalleryTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
