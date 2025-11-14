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
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
