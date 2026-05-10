import { Link } from 'react-router-dom';

const Refund = () => {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Returns & Refunds</h1>
        <p className="mt-2 text-slate-700">
          EverTrend facilitates second‑hand commerce between buyers and sellers. Refund eligibility
          depends on the listing condition, order status, and seller policy.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Quick Guidelines</h2>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
              <li>Request support as soon as an issue is identified.</li>
              <li>Provide photos if the item arrives damaged or not as described.</li>
              <li>Keep all packaging until the case is resolved.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
            <p className="mt-3 text-slate-700">
              All payments are processed securely via eSewa. If a refund is approved, it will be
              handled through the same payment flow where applicable.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Contact Support
          </Link>
          <Link
            to="/dashboard/buyer/orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Refund;

