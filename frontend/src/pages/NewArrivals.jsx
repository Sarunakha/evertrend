import { Link } from 'react-router-dom';

const NewArrivals = () => {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-emerald-50 to-white p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">New Arrivals</h1>
          <p className="mt-2 text-slate-700">
            Fresh thrift finds added by our community. Check back often—drops move fast.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Browse Products
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewArrivals;

