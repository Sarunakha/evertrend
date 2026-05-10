import { useEffect, useMemo, useState } from 'react';
import api from '../../../utils/api';

const FinancialStatement = () => {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0
    }).format(Number(amount || 0));

  const fetchStatement = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/financial-statement', {
        params: { page, limit: pagination.limit }
      });
      if (res.data?.success) {
        setRows(res.data.data.rows || []);
        setTotals(res.data.data.totals || null);
        setPagination(res.data.pagination || pagination);
      } else {
        setError('Failed to load financial statement');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load financial statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageButtons = useMemo(() => {
    const pages = pagination.pages || 1;
    const p = pagination.page || 1;
    const start = Math.max(1, p - 2);
    const end = Math.min(pages, p + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pagination.page, pagination.pages]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading financial statement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1100px] space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Financial Statement</h2>
              <p className="text-sm text-gray-600 mt-1">
                Shows commission (20%) earned per sold item and seller payouts for delivered orders.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Showing {pagination.limit} items per page.
              </p>
            </div>
            <button
              onClick={() => fetchStatement(pagination.page)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 rounded-xl p-6 shadow-md">
              <div className="text-sm text-emerald-800 font-medium">Total Income (Commission)</div>
              <div className="text-2xl font-bold text-emerald-900 mt-1">
                {formatCurrency(totals.adminCommission)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 shadow-md">
              <div className="text-sm text-blue-800 font-medium">Total Seller Payout</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {formatCurrency(totals.sellerPayout)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 shadow-md">
              <div className="text-sm text-slate-700 font-medium">Total Net Sales</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(totals.net)}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Line
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission (20%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller Payout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={7}>
                      No financial records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={`${r.orderId}-${r.productId || idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{String(r.orderId).slice(-8)}
                        <div className="text-xs text-gray-500">
                          {r.orderDate ? new Date(r.orderDate).toLocaleString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {r.productImage ? (
                            <img
                              src={r.productImage}
                              alt={r.productName || 'Item'}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {r.productName || 'Unknown Item'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty {r.quantity} × Rs. {Number(r.unitPrice || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{r.sellerName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{r.sellerEmail || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(r.netLine)}
                        {Number(r.discountShare || 0) > 0 && (
                          <div className="text-xs text-gray-500">
                            Discount share: -{formatCurrency(r.discountShare)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-700">
                        {formatCurrency(r.adminCommission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-700">
                        {formatCurrency(r.sellerPayout)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {r.paymentMethod || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} • {pagination.total} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                  onClick={() => fetchStatement(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                >
                  Prev
                </button>
                {pageButtons.map((p) => (
                  <button
                    key={p}
                    className={`px-3 py-1 rounded border text-sm ${
                      p === pagination.page ? 'bg-orange-600 text-white border-orange-600' : 'bg-white'
                    }`}
                    onClick={() => fetchStatement(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                  onClick={() => fetchStatement(Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialStatement;

