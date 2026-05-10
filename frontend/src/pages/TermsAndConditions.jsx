const TermsAndConditions = () => {
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900">Terms &amp; Conditions</h1>
          <p className="mt-2 text-slate-700">
            These highlights summarize the core terms for using EverTrend. By accessing or using
            EverTrend, you agree to the guidelines below.
          </p>

          <div className="mt-8 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1) Sustainability Clause</h2>
              <p className="mt-2 text-slate-700">
                Users agree that items sold on EverTrend are second-hand / thrifted to promote
                circular fashion and reduce waste.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2) Transaction Policy</h2>
              <p className="mt-2 text-slate-700">
                All payments are processed securely via eSewa; EverTrend acts as a facilitator
                between buyer and seller and does not take ownership of listed items.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3) AI Usage</h2>
              <p className="mt-2 text-slate-700">
                Users acknowledge that AI Size Recommendations and Virtual Try-Ons are estimations
                based on provided data and may not perfectly match real-world fit or appearance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4) Community Conduct</h2>
              <p className="mt-2 text-slate-700">
                As a social commerce platform, users must maintain respectful interactions in
                comments and follows. Harassment, hate speech, and abuse are not permitted.
              </p>
            </section>
          </div>

          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-900">
              By using EverTrend, you agree to our sustainable commerce and community guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

