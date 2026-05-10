import { Link } from 'react-router-dom';

const Shipping = () => {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Shipping</h1>
        <p className="mt-2 text-slate-700">
          Shipping details depend on the seller, delivery location, and courier availability.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">For Buyers</h2>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
              <li>Track your order status from your dashboard orders.</li>
              <li>Confirm delivery and leave feedback to support trusted sellers.</li>
              <li>Use secure payments via eSewa to protect your transaction.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">For Sellers</h2>
            <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-2">
              <li>Pack items carefully and ship promptly after payment confirmation.</li>
              <li>Share tracking details with the buyer when available.</li>
              <li>Communicate clearly via messages to avoid delivery issues.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/dashboard/buyer/orders"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            View Buyer Orders
          </Link>
          <Link
            to="/dashboard/seller/orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            Manage Seller Orders
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Shipping;

