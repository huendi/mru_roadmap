export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-start justify-center px-4">
      <div className="container mx-auto pt-4 pb-10 max-w-5xl">
        <div className="text-center">

          {/* Logo & Title */}
          <div className="mb-8">
            <img
              src="/MRU logo.png"
              alt="Mount Rushmore Unit"
              className="w-80 h-auto object-contain mx-auto mb-1"
            />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Mount Rushmore Unit
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-medium">
              Financial Advisor Certification Program
            </p>
            <p className="text-base text-gray-500 mt-3 max-w-2xl mx-auto">
              Your journey to becoming a certified Financial Advisor starts here
            </p>
          </div>

          {/* Feature cards — no wrapping box */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">

            <div className="bg-white p-6 rounded-xl shadow-md border border-yellow-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Structured Learning</h3>
              <p className="text-sm text-gray-600">Follow a clear 7-level roadmap to certification</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-yellow-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Track Progress</h3>
              <p className="text-sm text-gray-600">Monitor your completion status at every step</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-yellow-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Mock Exams</h3>
              <p className="text-sm text-gray-600">Practice with realistic exam questions</p>
            </div>

          </div>

          {/* CTA Button */}
          <a
            href="/auth"
            className="inline-block bg-yellow-600 text-white px-10 py-3 rounded-lg font-semibold hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors text-base"
          >
            Get Started
          </a>

        </div>
      </div>
    </main>
  )
}