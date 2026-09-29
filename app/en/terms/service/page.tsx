'use client'

export default function ServiceTermsPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl text-emerald-100">Effective Date: August 29, 2024</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Important Notice */}
        <div className="mb-12 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-l-4 border-[#3E7A5A] p-6">
          <div className="flex items-start gap-4">
            <div className="text-[#3E7A5A] text-3xl">⚠️</div>
            <div>
              <h3 className="text-xl font-bold text-[#3E7A5A] mb-2">Digital Content Refund Policy</h3>
              <p className="text-gray-300 leading-relaxed">
                Due to the nature of digital webtoon content, refunds are restricted once viewing has started.
                Please review free preview episodes before purchasing.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              1. Purpose
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              These Terms of Service govern the use of webtoon services (the "Service") provided by ARATA
              and establish the rights, obligations, and responsibilities between the Company and Users.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              2. Definitions
            </h2>
            <div className="space-y-4 text-gray-300 text-lg">
              <div className="flex gap-3">
                <span className="text-[#3E7A5A] font-bold">•</span>
                <p><span className="text-white font-semibold">Service:</span> All webtoon-related services provided through our website and mobile applications.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#3E7A5A] font-bold">•</span>
                <p><span className="text-white font-semibold">User:</span> Members and non-members who use the Service in accordance with these Terms.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#3E7A5A] font-bold">•</span>
                <p><span className="text-white font-semibold">Member:</span> Users who have registered by providing personal information and can continuously use the Service.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#3E7A5A] font-bold">•</span>
                <p><span className="text-white font-semibold">Content:</span> All webtoons, images, text, audio, video, and other materials provided in the Service.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-[#3E7A5A] font-bold">•</span>
                <p><span className="text-white font-semibold">Coins:</span> Virtual currency purchased to access premium content within the Service.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              3. Service Provision
            </h2>
            <div className="space-y-3 text-gray-300 text-lg">
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                The Service is available 24 hours a day, 365 days a year, in principle.
              </p>
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                The Company may temporarily suspend the Service for maintenance, repairs, or operational reasons.
              </p>
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                Users will be notified of any service changes or scheduled maintenance in advance.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              4. Payment and Coins
            </h2>
            <div className="space-y-3 text-gray-300 text-lg">
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                Coins must be purchased to access premium content, and purchased coins are immediately credited to your account.
              </p>
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                Payment can be made through credit cards, mobile payments, and other methods provided by the Company.
              </p>
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                Coins are valid for 5 years from the date of purchase and will automatically expire after this period.
              </p>
              <p className="flex gap-3">
                <span className="text-[#3E7A5A]">→</span>
                The Company reserves the right to withhold or reclaim coins in cases of system errors or fraudulent transactions.
              </p>
            </div>
          </section>

          {/* Section 5 - Refund Policy */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              5. Cancellation and Refund Policy
            </h2>

            <div className="bg-gray-900 p-6 rounded-lg mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Refund Restrictions for Digital Content</h3>

              <div className="space-y-6 text-gray-300">
                <div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">Refund Period</h4>
                  <p>Within 7 days of payment completion</p>
                </div>

                <div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">Refund Restrictions</h4>
                  <ul className="space-y-2 ml-4">
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Episodes that have already been viewed</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Content automatically viewed after selecting "View Now"</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Content with free preview episodes available</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">Refund Available</h4>
                  <ul className="space-y-2 ml-4">
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Payment completed but content not yet viewed</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Service malfunction preventing normal use</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Incorrect payment (duplicate payment, payment error, etc.)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">Refund Timeline</h4>
                  <ul className="space-y-2 ml-4">
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Credit Card: 3-5 days after cancellation approval</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Bank Transfer: Within 3 business days</li>
                    <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Mobile Payment: Deducted from next month's bill</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-[#3E7A5A] font-bold text-lg mb-2">Partial Refunds</h4>
                  <p>For series purchases, partial refunds are available for unread episodes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              6. Exchange and Returns
            </h2>
            <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-lg mb-4">
              <p className="text-red-400 font-bold text-lg mb-3">
                Due to the nature of digital content, exchanges and returns are generally not possible.
              </p>
            </div>
            <div className="text-gray-300 text-lg space-y-3">
              <p className="font-semibold text-white mb-3">However, exchanges or refunds may be provided in the following cases:</p>
              <p className="flex gap-3"><span className="text-[#3E7A5A]">→</span> Technical defects preventing content access</p>
              <p className="flex gap-3"><span className="text-[#3E7A5A]">→</span> Significant discrepancy between product description and actual content</p>
              <p className="flex gap-3"><span className="text-[#3E7A5A]">→</span> Service interruption preventing content access</p>
              <p className="mt-4">Exchange requests must be submitted within 7 days of the issue occurring.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              7. Cancellation Policy
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-900 p-6 rounded-lg">
                <h4 className="text-[#3E7A5A] font-bold text-lg mb-3">Subscription Cancellation</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Cancel up to 24h before billing</li>
                  <li className="flex gap-2"><span className="text-[#3E7A5A]">•</span> Cancel anytime from My Page</li>
                </ul>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg">
                <h4 className="text-green-400 font-bold text-lg mb-3">Immediate Cancellation</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Within 30 min (not viewed)</li>
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Duplicate payment error</li>
                  <li className="flex gap-2"><span className="text-green-500">✓</span> Unauthorized minor payment</li>
                </ul>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg">
                <h4 className="text-red-400 font-bold text-lg mb-3">Not Available</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex gap-2"><span className="text-red-500">✗</span> After viewing content</li>
                  <li className="flex gap-2"><span className="text-red-500">✗</span> Promotional purchases</li>
                  <li className="flex gap-2"><span className="text-red-500">✗</span> After free trial</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8 - Contact */}
          <section>
            <h2 className="text-3xl font-bold text-[#3E7A5A] mb-6 border-b-2 border-[#3E7A5A] pb-3">
              8. Contact Information
            </h2>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-lg">
              <p className="text-gray-300 text-lg mb-6">
                For refunds, exchanges, cancellations, or service inquiries, please contact us:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="text-[#3E7A5A] text-4xl">📧</div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <a href="mailto:support@arata.co.kr" className="text-[#3E7A5A] hover:text-[#3E7A5A] transition-colors text-xl font-semibold">
                      support@arata.co.kr
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[#3E7A5A] text-4xl">⏰</div>
                  <div>
                    <p className="text-gray-400 text-sm">Business Hours</p>
                    <p className="text-white text-xl font-semibold">Weekdays 09:00-18:00 (KST)</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-gray-400 italic">
                  ※ For urgent inquiries, email us and we will respond within 24 hours.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Notice */}
        <div className="mt-16 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-[#3E7A5A]/30 p-8 rounded-lg">
          <h3 className="text-2xl font-bold text-[#3E7A5A] mb-4">Important Notice</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              Due to the nature of digital content, refunds are restricted once downloading or streaming begins.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              Please review content through preview or free episodes before purchasing.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              Payments made by minors without parental consent may be cancelled.
            </li>
            <li className="flex gap-3">
              <span className="text-[#3E7A5A] font-bold">•</span>
              These Terms are effective as of August 29, 2024.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
