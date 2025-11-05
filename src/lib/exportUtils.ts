import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType } from 'docx';
import { OptimizedResume } from '@/types/resume';

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

export async function exportAsWord(resume: OptimizedResume, filename: string): Promise<void> {
  try {
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "normalPara",
            name: "Normal Para",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 20, font: "Helvetica" },
            paragraph: { spacing: { after: 120 } },
          },
        ],
      },
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [new TextRun({ text: resume.header.name, bold: true, size: 40, font: "Helvetica-Bold" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: resume.header.contact, size: 20, font: "Helvetica" })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }), // Empty line
          
          // Professional Summary
          new Paragraph({
            text: "PROFESSIONAL SUMMARY",
            heading: HeadingLevel.HEADING_1,
            style: "normalPara",
          }),
          new Paragraph({
            children: [new TextRun({ text: resume.summary, size: 20, font: "Helvetica" })],
            style: "normalPara",
          }),
          new Paragraph({ text: "" }), // Empty line
          
          // Professional Experience
          new Paragraph({
            text: "PROFESSIONAL EXPERIENCE",
            heading: HeadingLevel.HEADING_1,
            style: "normalPara",
          }),
          ...resume.experience.flatMap(exp => [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: exp.company, bold: true, size: 20, font: "Helvetica-Bold" })] })] }),
                    new TableCell({ children: [new Paragraph({ text: exp.location, alignment: AlignmentType.RIGHT, style: "normalPara" })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: exp.title, italics: true, size: 20, font: "Helvetica-Oblique" })] })] }),
                    new TableCell({ children: [new Paragraph({ text: exp.dates, alignment: AlignmentType.RIGHT, style: "normalPara" })] }),
                  ],
                }),
              ],
            }),
            ...exp.bullets.map(bullet => 
              new Paragraph({ children: [new TextRun({ text: `• ${bullet}`, size: 20, font: "Helvetica" })], style: "normalPara" })
            ),
            new Paragraph({ text: "" }), // Empty line
          ]),
          
          // Education
          new Paragraph({
            text: "EDUCATION",
            heading: HeadingLevel.HEADING_1,
            style: "normalPara",
          }),
          ...resume.education.flatMap(edu => [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: edu.school, bold: true, size: 20, font: "Helvetica-Bold" })] })] }),
                    new TableCell({ children: [new Paragraph({ text: edu.location, alignment: AlignmentType.RIGHT, style: "normalPara" })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: edu.degree, size: 20, font: "Helvetica" })] })] }),
                    new TableCell({ children: [new Paragraph({ text: edu.dates, alignment: AlignmentType.RIGHT, style: "normalPara" })] }),
                  ],
                }),
              ],
            }),
            ...(edu.bullets ? edu.bullets.map(bullet => 
              new Paragraph({ children: [new TextRun({ text: `• ${bullet}`, size: 20, font: "Helvetica" })], style: "normalPara" })
            ) : []),
            new Paragraph({ text: "" }), // Empty line
          ]),
          
          // Additional Information
          new Paragraph({
            text: "ADDITIONAL INFORMATION",
            heading: HeadingLevel.HEADING_1,
            style: "normalPara",
          }),
          ...(resume.additional.technical_skills ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Technical Skills: ", bold: true, size: 20, font: "Helvetica-Bold" }),
                new TextRun({ text: resume.additional.technical_skills, size: 20, font: "Helvetica" })
              ],
              style: "normalPara",
            })
          ] : []),
          ...(resume.additional.languages ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Languages: ", bold: true, size: 20, font: "Helvetica-Bold" }),
                new TextRun({ text: resume.additional.languages, size: 20, font: "Helvetica" })
              ],
              style: "normalPara",
            })
          ] : []),
          ...(resume.additional.certifications ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Certifications: ", bold: true, size: 20, font: "Helvetica-Bold" }),
                new TextRun({ text: resume.additional.certifications, size: 20, font: "Helvetica" })
              ],
              style: "normalPara",
            })
          ] : []),
          ...(resume.additional.awards ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Awards: ", bold: true, size: 20, font: "Helvetica-Bold" }),
                new TextRun({ text: resume.additional.awards, size: 20, font: "Helvetica" })
              ],
              style: "normalPara",
            })
          ] : []),
        ],
      }],
    });

    // Use toBlob() instead of toBuffer() for browser compatibility
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Word export error:', error);
    throw new Error(`Failed to export Word document: ${error.message}`);
  }
}

export async function exportAsJSON(resume: OptimizedResume, filename: string): Promise<void> {
  const jsonString = JSON.stringify(resume, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}