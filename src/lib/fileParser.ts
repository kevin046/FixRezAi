import mammoth from 'mammoth';

export async function parseFile(file: File): Promise<string> {
  const fileType = file.type;
  
  try {
    let extractedText = '';
    
    if (fileType === 'application/pdf') {
      extractedText = await parsePDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await parseDocx(file);
    } else if (fileType === 'text/plain') {
      extractedText = await parseText(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. Please upload PDF, DOCX, or TXT files.`);
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content could be extracted from the file. Please ensure the file contains readable text.');
    }

    // Normalize the extracted text to improve AI parsing
    extractedText = normalizeExtractedText(extractedText);
    
    return extractedText;
  } catch (error) {
    console.error('❌ FileParser: Error parsing file:', error);
    throw error;
  }
}

async function parsePDF(file: File): Promise<string> {
  try {
    // Dynamic import for better browser compatibility
    const pdfParse = await import('pdf-parse');
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // @ts-ignore - pdf-parse types are not properly defined
    const data = await pdfParse.default(uint8Array);
    
    return data.text;
  } catch (error) {
    console.error('❌ FileParser: PDF parsing error:', error);
    
    // Fallback: Try to read as text if PDF parsing fails
    try {
      const text = await file.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (fallbackError) {
      console.error('❌ FileParser: Fallback extraction also failed:', fallbackError);
    }
    
    throw new Error('Failed to parse PDF file. The file may be corrupted, password-protected, or contain only images. Please try converting it to text or uploading a different format.');
  }
}

async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return result.value;
  } catch (error) {
    console.error('❌ FileParser: DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file. Please ensure it\'s a valid Word document and not corrupted.');
  }
}

async function parseText(file: File): Promise<string> {
  try {
    const text = await file.text();
    
    return text;
  } catch (error) {
    console.error('❌ FileParser: Text parsing error:', error);
    throw new Error('Failed to read text file. Please ensure the file is not corrupted.');
  }
}

function normalizeExtractedText(raw: string): string {
  let text = raw;

  // Normalize line endings and tabs
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\t/g, ' ');

  // Collapse multiple spaces and non-breaking spaces
  text = text.replace(/[ \u00A0]{2,}/g, ' ');

  // Normalize common bullet characters to a simple dash
  text = text.replace(/[•▪·○◆◦]/g, '- ');

  // Reduce excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim spaces around newlines
  text = text.replace(/[ ]+\n/g, '\n').replace(/\n[ ]+/g, '\n');

  // Remove common header/footer artifacts like page markers
  text = text.replace(/\bPage\s+\d+\s+of\s+\d+\b/gi, '');

  return text.trim();
}

export function validateResumeText(text: string): boolean {
  // Basic validation - check if text has minimum content
  const trimmedText = text.trim();
  if (trimmedText.length < 50) {
    return false;
  }
  
  // Check for common resume sections or patterns
  const commonSections = [
    'experience', 'education', 'skills', 'work', 'employment', 
    'summary', 'objective', 'profile', 'background', 'career',
    'position', 'job', 'role', 'responsibilities', 'achievements',
    'university', 'college', 'degree', 'certification', 'training'
  ];
  
  const lowerText = trimmedText.toLowerCase();
  const matchedSections = commonSections.filter(section => lowerText.includes(section));
  
  return matchedSections.length > 0;
}