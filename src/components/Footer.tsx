import { Facebook, Instagram, Linkedin } from 'lucide-react'

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
          <div className="flex items-center gap-6 text-sm">
            <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
            <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
            <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
            <a href="/accessibility" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Accessibility</a>
            <a href="/settings#security" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Security</a>
            <a href="/sitemap" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Sitemap</a>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <XIcon className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/company/summit-pixels-inc" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
