import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, ArrowLeft, RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, secureFetch } from '../../config/api';
import toast from 'react-hot-toast';
import { handleSessionExpiration } from '../../utils/security';
import ConfirmModal from '../../components/ConfirmModal';
import { Pagination } from '../../components/ui';

const PAYMENTS_PER_PAGE = 25;

export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, limit: PAYMENTS_PER_PAGE, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null); // { paymentId, status }

  /**
   * Paged explicitly — without `page`/`limit` only the server's first 50
   * payments were reachable, so older proofs could never be verified.
   *
   * `isActive` lets the caller discard a response whose effect has already been
   * cleaned up, avoiding a state update from a stale request.
   */
  const fetchPayments = useCallback(
    async (isActive = true) => {
      try {
        const query = `page=${page}&limit=${PAYMENTS_PER_PAGE}`;
        const res = await secureFetch(`${API_BASE_URL}/api/admin/payments?${query}`);
        if (!res.ok) {
          if (handleSessionExpiration(res, navigate)) return;
          throw new Error('Failed to fetch payments');
        }
        const data = await res.json();
        if (!isActive) return;
        setPayments(data.payments || []);
        setPageInfo({
          page: data.page ?? 1,
          limit: data.limit ?? PAYMENTS_PER_PAGE,
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 1,
        });
        setError('');
      } catch (err) {
        if (isActive) setError(err.message);
      } finally {
        if (isActive) setLoading(false);
      }
    },
    [page, navigate]
  );

  // No synchronous setState in the effect body — `loading` already starts true
  // and every update below happens after an await.
  useEffect(() => {
    let active = true;
    (async () => {
      await fetchPayments(active);
    })();
    return () => {
      active = false;
    };
  }, [fetchPayments]);

  const confirmVerify = async () => {
    if (!confirmTarget) return;
    const { paymentId, status } = confirmTarget;
    setConfirmTarget(null);

    try {
      const res = await secureFetch(`${API_BASE_URL}/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ status, adminNotes: '' }),
      });

      if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} payment`);
      
      toast.success(`Payment ${status.toLowerCase()} successfully!`);
      fetchPayments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')} 
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2} /> Back to Dashboard
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" strokeWidth={2.5} />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Payment Verifications</h1>
          <button 
            onClick={() => { setLoading(true); fetchPayments(); }} 
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <RefreshCw className="animate-spin text-gray-400 mx-auto mb-3" size={24} />
            <p className="text-sm text-gray-500">Loading payments...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-red-600">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">School Name</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Proof</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">No payments found.</td>
                  </tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800">{p.school.schoolName}</p>
                      <p className="text-xs text-gray-500">{p.school.email}</p>
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-700">₹{p.amount || 0}</td>
                    <td className="px-4 py-4">
                      {p.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock size={14}/> Pending</span>}
                      {p.status === 'VERIFIED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle size={14}/> Verified</span>}
                      {p.status === 'REJECTED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><XCircle size={14}/> Rejected</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <a href={p.paymentProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline">
                        View <ExternalLink size={14} />
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.status === 'PENDING' ? (
                          <>
                            <button onClick={() => setConfirmTarget({ paymentId: p.id, status: 'VERIFIED' })} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition cursor-pointer">Verify</button>
                            <button onClick={() => setConfirmTarget({ paymentId: p.id, status: 'REJECTED' })} className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition cursor-pointer">Reject</button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={pageInfo.page}
              totalPages={pageInfo.totalPages}
              total={pageInfo.total}
              limit={pageInfo.limit}
              onChange={setPage}
              label="payments"
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmTarget}
        title={`${confirmTarget?.status === 'VERIFIED' ? 'Verify' : 'Reject'} Payment`}
        message={`Are you sure you want to mark this payment as ${confirmTarget?.status}?`}
        confirmText={confirmTarget?.status === 'VERIFIED' ? 'Approve Payment' : 'Reject Payment'}
        confirmVariant={confirmTarget?.status === 'VERIFIED' ? 'success' : 'danger'}
        onConfirm={confirmVerify}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
