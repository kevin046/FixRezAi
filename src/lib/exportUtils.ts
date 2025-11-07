import { OptimizedResume } from '@/types/resume';

// Template variants for export styling
type TemplateVariant = 'modern' | 'classic' | 'executive'

export async function exportAsText(resume: OptimizedResume, filename: string): Promise<void> {
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
  
  downloadFile(text, filename, 'text/plain');
}

export async function exportAsJSON(resume: OptimizedResume, filename: string): Promise<void> {
  const json = JSON.stringify(resume, null, 2);
  downloadFile(json, filename, 'application/json');
}

export async function exportLinkedInSummary(resume: OptimizedResume, filename: string): Promise<void> {
  const content = `ABOUT\n${resume.summary}\n\nSKILLS\n${resume.additional.technical_skills || ''}`
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