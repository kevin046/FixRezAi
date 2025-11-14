import { Twitter, Facebook, Instagram, Link2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface SocialShareButtonsProps {
  url?: string
  title?: string
  description?: string
  hashtags?: string[]
}

export default function SocialShareButtons({ 
  url = window.location.href,
  title = 'FixRez AI - Professional Resume Optimization Tool',
  description = 'Optimize your resume with AI and get past ATS systems to land more interviews',
  hashtags = ['ResumeOptimization', 'AITools', 'JobSearch', 'Career']
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`${title} - ${description}`)
    const hashtagsStr = hashtags.join(',')
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}&hashtags=${hashtagsStr}`, '_blank')
  }

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
  }

  const shareOnInstagram = () => {
    // Instagram doesn't have a direct share URL, so we'll copy to clipboard
    copyToClipboard()
    toast.success('Link copied! Share it on your Instagram story or bio.')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">
        Share:
      </span>
      
      <button
        onClick={shareOnTwitter}
        className="inline-flex items-center justify-center w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full transition-colors duration-200"
        aria-label="Share on X (Twitter)"
      >
        <Twitter className="w-4 h-4" />
      </button>
      
      <button
        onClick={shareOnFacebook}
        className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-200"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      
      <button
        onClick={shareOnInstagram}
        className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-full transition-all duration-200"
        aria-label="Share on Instagram"
      >
        <Instagram className="w-4 h-4" />
      </button>
      
      <button
        onClick={copyToClipboard}
        className={`inline-flex items-center justify-center w-10 h-10 ${copied ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-full transition-colors duration-200`}
        aria-label="Copy link"
      >
        <Link2 className="w-4 h-4" />
      </button>
    </div>
  )
}