import { OptimizedResume } from '@/types/resume';
import { logExport, storeExportFormat } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

// Utility function to get user information for tracking
async function getExportContext() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return {
      userId: user?.id,
      ipAddress: await getClientIP(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown'
    }
  } catch {
    return { userId: null, ipAddress: null, userAgent: 'Unknown' }
  }
}

// Simple IP detection (will be the client's IP when called from browser)
async function getClientIP(): Promise<string | null> {
  try {
    // In a real implementation, you might want to use a service or server endpoint
    // For now, we'll store null and let the server handle IP detection
    return null
  } catch {
    return null
  }
}

// Create hash of content for deduplication and integrity
function createContentHash(content: string): string {
  // Simple hash implementation for browser
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Template variants for export styling
type TemplateVariant = 'modern' | 'classic' | 'executive'

export async function exportAsText(resume: OptimizedResume, filename: string, template?: TemplateVariant): Promise<void> {
  let text = '';
  
  // Header
  text += `${resume.header.name}\n`;
  text += `${resume.header.contact}\n\n`;
  
  // Professional Summary
  text += `PROFESSIONAL SUMMARY\n`;
  text += `${resume.summary}\n\n`;
  
  // Professional Experience
  text += `PROFESSIONAL EXPERIENCE\n`;
  resume.experience.forEach(exp => {
    text += `${exp.company} | ${exp.location} | ${exp.dates}\n`;
    text += `${exp.title}\n`;
    exp.bullets.forEach(bullet => {
      text += `• ${bullet}\n`;
    });
    text += '\n';
  });
  
  // Education
  text += `EDUCATION\n`;
  resume.education.forEach(edu => {
    text += `${edu.school} | ${edu.location} | ${edu.dates}\n`;
    text += `${edu.degree}\n`;
    if (edu.bullets && edu.bullets.length > 0) {
      edu.bullets.forEach(bullet => {
        text += `• ${bullet}\n`;
      });
    }
    text += '\n';
  });
  
  // Additional Information
  text += `ADDITIONAL INFORMATION\n`;
  if (resume.additional.technical_skills) {
    text += `Technical Skills: ${resume.additional.technical_skills}\n`;
  }
  if (resume.additional.languages) {
    text += `Languages: ${resume.additional.languages}\n`;
  }
  if (resume.additional.certifications) {
    text += `Certifications: ${resume.additional.certifications}\n`;
  }
  if (resume.additional.awards) {
    text += `Awards: ${resume.additional.awards}\n`;
  }
  
  // Track export with comprehensive data
  const context = await getExportContext();
  const contentHash = createContentHash(text);
  const blob = new Blob([text], { type: 'text/plain' });
  
  const exportId = await logExport({
    id: crypto.randomUUID(),
    ts: Date.now(),
    format: 'text',
    template: undefined,
    filename: filename,
    fileSizeBytes: blob.size,
    exportDataHash: contentHash,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  
  // Store the actual content in export_formats if export was successful
  if (exportId) {
    await storeExportFormat(exportId, 'text', text, {
      characterCount: text.length,
      lineCount: text.split('\n').length
    });
  }
  
  downloadFile(text, filename, 'text/plain');
}

export async function exportAsJSON(resume: OptimizedResume, filename: string, template?: TemplateVariant): Promise<void> {
  const json = JSON.stringify(resume, null, 2);
  
  // Track export with comprehensive data
  const context = await getExportContext();
  const contentHash = createContentHash(json);
  const blob = new Blob([json], { type: 'application/json' });
  
  const exportId = await logExport({
    id: crypto.randomUUID(),
    ts: Date.now(),
    format: 'json',
    template: template,
    filename: filename,
    fileSizeBytes: blob.size,
    exportDataHash: contentHash,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  
  // Store the actual content in export_formats if export was successful
  if (exportId) {
    await storeExportFormat(exportId, 'json', json, {
      template: template,
      characterCount: json.length,
      objectCount: Object.keys(resume).length
    });
  }
  downloadFile(json, filename, 'application/json');
}

export async function exportLinkedInSummary(resume: OptimizedResume, filename: string, template?: TemplateVariant): Promise<void> {
  const content = `ABOUT\n${resume.summary}\n\nSKILLS\n${resume.additional.technical_skills || ''}`
  
  // Track export with comprehensive data
  const context = await getExportContext();
  const contentHash = createContentHash(content);
  const blob = new Blob([content], { type: 'text/plain' });
  
  const exportId = await logExport({
    id: crypto.randomUUID(),
    ts: Date.now(),
    format: 'linkedin',
    template: template,
    filename: filename,
    fileSizeBytes: blob.size,
    exportDataHash: contentHash,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  
  // Store the actual content in export_formats if export was successful
  if (exportId) {
    await storeExportFormat(exportId, 'linkedin', content, {
      template: template,
      characterCount: content.length,
      lineCount: content.split('\n').length,
      summaryLength: resume.summary.length,
      skillsCount: (resume.additional.technical_skills || '').split(',').length
    });
  }
  downloadFile(content, filename, 'text/plain')
}

// Lightweight export analytics (localStorage-based)
export function trackExport(format: string, template?: TemplateVariant): void {
  try {
    const key = 'fixrez_export_analytics'
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    const data = raw ? JSON.parse(raw) : { counts: {}, lastExport: null }
    data.counts[format] = (data.counts[format] || 0) + 1
    data.lastExport = { format, template: template || null, ts: Date.now() }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(data))
    }
    console.log('📊 Export analytics:', data.lastExport)
  } catch (e) {
    console.log('Analytics storage unavailable, skipping.')
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}