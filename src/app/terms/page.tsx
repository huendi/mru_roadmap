export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Mount Rushmore Unit (MRU) Financial Advisor Roadmap platform, 
                you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials on MRU Financial 
                Advisor Roadmap for personal, non-commercial transitory viewing only. This is the grant of a 
                license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>modify or copy the materials</li>
                <li>use the materials for any commercial purpose or for any public display</li>
                <li>attempt to reverse engineer any software contained on MRU Financial Advisor Roadmap</li>
                <li>remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Disclaimer</h2>
              <p>
                The materials on MRU Financial Advisor Roadmap are provided on an 'as is' basis. 
                MRU makes no warranties, expressed or implied, and hereby disclaims and negates all 
                other warranties including without limitation, implied warranties or conditions of merchantability, 
                fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Limitations</h2>
              <p>
                In no event shall MRU or its suppliers be liable for any damages (including, without 
                limitation, damages for loss of data or profit, or due to business interruption) arising 
                out of the use or inability to use the materials on MRU Financial Advisor Roadmap, even if 
                MRU or an MRU authorized representative has been notified orally or in writing of the 
                possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Accuracy of Materials</h2>
              <p>
                The materials appearing on MRU Financial Advisor Roadmap could include technical, typographical, 
                or photographic errors. MRU does not warrant that any of the materials on its website are 
                accurate, complete, or current. MRU may make changes to the materials contained on 
                its website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. User Account</h2>
              <p>
                To access certain features of our platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Provide accurate, current, and complete information as prompted by our registration form</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Privacy Policy</h2>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, 
                and protect your information when you use our platform. By using our services, you agree 
                to the collection and use of information in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Educational Content</h2>
              <p>
                The MRU Financial Advisor Roadmap provides educational materials and training for financial 
                advisor certification. Completion of our program does not guarantee certification or employment. 
                Certification requirements are subject to change and may vary by jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Prohibited Activities</h2>
              <p>
                You may not use our platform for any illegal or unauthorized purpose. You agree not to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload malicious code or viruses</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the platform immediately, 
                without prior notice or liability, under our sole discretion, for any reason whatsoever, 
                including without limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a revision is 
                material, we will provide at least 30 days notice prior to any new terms taking effect. 
                Your continued use of the platform after the effective date of the revised Terms constitutes 
                acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Information</h2>
              <p>
                Questions about the Terms and Conditions should be sent to us at 
                <a href="mailto:info@mru-roadmap.com" className="text-blue-600 hover:text-blue-800 underline">
                  info@mru-roadmap.com
                </a>
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
