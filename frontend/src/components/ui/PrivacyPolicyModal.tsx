import { useEffect } from 'react'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-card relative w-full max-w-[540px] max-h-[80vh] overflow-y-auto rounded-[28px] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close privacy policy"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Privacy Policy</h2>

        <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-600">
          <p>
            Welcome to <span className="font-medium text-slate-800">Eat It Up</span>. By using our service, you agree to this Privacy Policy. Please read it carefully before proceeding.
          </p>

          {/* Section 1 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">1. Data Architecture (What We Collect)</h3>
            <ul className="mt-2 ml-5 list-disc space-y-2">
              <li>
                <span className="font-medium text-slate-700">Account Data (Name & Email):</span> Used to personalise your dashboard experience, manage your secure active session, and authenticate your account through Supabase.
              </li>
              <li>
                <span className="font-medium text-slate-700">Profile Preferences:</span> Optional demographic insights (such as age brackets and preferences) are entirely anonymised to protect your identity, while ensuring tailored application features.
              </li>
              <li>
                <span className="font-medium text-slate-700">Inventory & Tracking Logs:</span> Your logged fridge items, expiry dates, consumption workflows, and sustainability rewards are saved securely to populate your dynamic tracking metrics.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">2. Purpose of Processing (How Your Data Drives the App)</h3>
            <ul className="mt-2 ml-5 list-disc space-y-2">
              <li>
                <span className="font-medium text-slate-700">To Optimise Inventory Tracking:</span> Fridge data and unit inputs enable us to trigger timely expiry alerts and manage your ingredients efficiently.
              </li>
              <li>
                <span className="font-medium text-slate-700">To Persist Your Progress safely:</span> Saving data rows to our secure database backend allows you to safely retrieve and reference your sustainability goals and financial savings.
              </li>
              <li>
                <span className="font-medium text-slate-700">To Enforce Security & Integrity:</span> Session data helps prevent unauthorised access across different devices, keeping your personal workspace private.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">3. Governance & Deletion Rights (Your Security Guards)</h3>
            <p className="mt-2">
              We strictly enforce Supabase Row Level Security (RLS) policies, meaning your data is accessible exclusively by you. We never sell your personal information to third parties. Furthermore, we support absolute data privacy: if you choose 'Account Termination', our system automatically triggers a clean cascading purge, completely deleting all corresponding profile and inventory rows from the database.
            </p>
          </div>

          {/* Section 4 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">4. Storage Mechanisms & Cookies</h3>
            <p className="mt-2">
              We utilise essential session storage mechanisms and cookies to maintain your authenticated login state (including 'Keep Me Logged In' features). These do not track your activity across external websites and are automatically cleared based on your chosen session preferences.
            </p>
          </div>
        </div>

        {/* Close button at bottom */}
        <div className="mt-8">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-slate-800 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-700 hover:scale-[1.01] active:scale-[0.99]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}