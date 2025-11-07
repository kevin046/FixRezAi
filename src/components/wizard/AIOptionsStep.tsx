import { Card } from '../ui/card'
import { Button } from '../ui/button'
import type { AIOptions, ToneOption, IndustryOption, StyleOption, ATSLevelOption } from '@/types/resume'

interface AIOptionsStepProps {
  options: AIOptions
  onOptionsChange: (opts: AIOptions) => void
}

const toneOptions: ToneOption[] = ['Professional', 'Creative', 'Technical', 'Executive']
const industryOptions: IndustryOption[] = ['Tech', 'Finance', 'Healthcare', 'Marketing', 'Education', 'Consulting', 'Sales', 'Operations', 'Product', 'Design']
const styleOptions: StyleOption[] = ['Conservative', 'Modern', 'Achievement-focused']
const atsLevelOptions: ATSLevelOption[] = ['Basic', 'Advanced', 'Aggressive']

export function AIOptionsStep({ options, onOptionsChange }: AIOptionsStepProps) {
  const update = (field: keyof AIOptions, value: any) => {
    onOptionsChange({ ...options, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">AI Configuration</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Customize how the AI optimizes your resume. These preferences guide tone, industry focus, style, and ATS optimization depth.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tone</label>
            <select
              value={options.tone}
              onChange={(e) => update('tone', e.target.value as ToneOption)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              {toneOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry</label>
            <select
              value={options.industry}
              onChange={(e) => update('industry', e.target.value as IndustryOption)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              {industryOptions.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style</label>
            <select
              value={options.style}
              onChange={(e) => update('style', e.target.value as StyleOption)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              {styleOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ATS Optimization Level</label>
            <select
              value={options.atsLevel}
              onChange={(e) => update('atsLevel', e.target.value as ATSLevelOption)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              {atsLevelOptions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-1"><span className="font-medium">Tips:</span> "Modern" style with "Achievement-focused" emphasizes impact bullets. "Aggressive" ATS level maximizes keyword coverage but keeps natural tone.</p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOptionsChange({ tone: 'Professional', industry: 'Tech', style: 'Achievement-focused', atsLevel: 'Advanced' })}
          >
            Use Recommended
          </Button>
        </div>
      </Card>
    </div>
  )
}