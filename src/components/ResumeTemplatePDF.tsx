import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { OptimizedResume } from '@/types/resume'

// === PROFESSIONAL COLOR PALETTE ===
const COLORS = {
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#999999',
  white: '#FFFFFF',
};

// === PROFESSIONAL PDF FONTS ===
const PDF_FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
};

// === BASE STYLES (NORMAL MODE) ===
const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONTS.regular,
    fontSize: 10,
    padding: 72,
    lineHeight: 1.15,
    color: COLORS.black,
    backgroundColor: COLORS.white,
    flexDirection: 'column',
  },
  header: {
    marginBottom: 12,
    textAlign: 'center',
  },
  name: {
    fontSize: 22,
    fontFamily: PDF_FONTS.bold,
    letterSpacing: 1.2,
    marginBottom: 12,
    color: COLORS.black,
    textTransform: 'uppercase',
  },
  contactInfo: {
    fontSize: 10,
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    letterSpacing: 0.3,
    lineHeight: 1.2,
    marginBottom: 2,
  },
  contactGroup: {
    marginTop: 10,
    alignItems: 'center',
  },
  contactLine: {
    fontSize: 10,
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    letterSpacing: 0.2,
    lineHeight: 1.25,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionsContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  sectionsContainerExpanded: {
    justifyContent: 'space-between',
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: PDF_FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.black,
    marginBottom: 10,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.black,
    borderBottomStyle: 'solid',
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.18,
    textAlign: 'justify',
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    marginBottom: 8,
  },
  experienceItem: {
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0.7,
  },
  company: {
    fontSize: 11,
    fontFamily: PDF_FONTS.bold,
    color: COLORS.black,
    letterSpacing: 0.15,
    flex: 1,
  },
  location: {
    fontSize: 10,
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    textAlign: 'right',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  role: {
    fontSize: 10,
    fontFamily: PDF_FONTS.italic,
    color: COLORS.black,
    letterSpacing: 0.1,
    flex: 1,
  },
  dates: {
    fontSize: 10,
    fontFamily: PDF_FONTS.regular,
    color: COLORS.black,
    textAlign: 'right',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 0.8,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 7,
    fontSize: 10,
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    marginTop: 0.2,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.2,
    textAlign: 'justify',
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    paddingLeft: 2,
  },
  educationItem: {
    marginBottom: 4,
  },
  school: {
    fontSize: 11,
    fontFamily: PDF_FONTS.bold,
    color: COLORS.black,
    letterSpacing: 0.15,
    flex: 1,
  },
  degree: {
    fontSize: 10,
    fontFamily: PDF_FONTS.regular,
    color: COLORS.black,
    letterSpacing: 0.1,
    flex: 1,
  },
  educationDetails: {
    fontSize: 10,
    fontFamily: PDF_FONTS.regular,
    color: COLORS.black,
    marginTop: 0.5,
    lineHeight: 1.18,
  },
  additionalSection: {
    marginBottom: 8,
  },
  additionalTitle: {
    fontSize: 11,
    fontFamily: PDF_FONTS.bold,
    color: COLORS.black,
    marginBottom: 0.7,
    letterSpacing: 0.1,
  },
  additionalText: {
    fontSize: 10,
    lineHeight: 1.18,
    color: COLORS.black,
    fontFamily: PDF_FONTS.regular,
    textAlign: 'justify',
  },
});

// === DENSITY & FIT CALCULATION ===
const approxLines = (text: string, charsPerLine = 85) => {
  if (!text) return 0;
  const t = String(text);
  const hardLines = t.split(/\n+/).length;
  const softLines = Math.ceil(t.replace(/\n+/g, ' ').length / charsPerLine);
  return Math.max(hardLines, softLines);
};

const estimateTotalLines = (resume: OptimizedResume) => {
  let lines = 0;
  lines += approxLines(resume.summary || '');
  (resume.experience || []).forEach(exp => {
    lines += 2; // company/location + role/dates rows
    (exp.bullets || []).forEach(b => { lines += approxLines(b, 80); });
  });
  (resume.education || []).forEach(edu => {
    lines += 2; // school/location + degree/dates rows
    lines += approxLines((edu as any).minor || '', 90);
    lines += approxLines((edu as any).details || '', 90);
  });
  const add = resume.additional || {} as any;
  lines += approxLines(add.technical_skills || '', 90);
  lines += approxLines(add.languages || '', 90);
  lines += approxLines(add.certifications || '', 90);
  lines += approxLines(add.awards || '', 90);
  return lines;
};

// Estimate total character length of content for scaling decisions
const estimateContentLength = (resume: OptimizedResume): number => {
  let total = 0;

  const addStr = (s?: string) => { if (s) total += String(s).length; };
  const addArr = (arr?: string[]) => { (arr || []).forEach(b => addStr(b)); };

  // Header
  addStr(resume.header?.name);
  addStr(resume.header?.contact);
  const headerAny = resume.header as any
  addStr(headerAny.address);

  // Summary
  addStr(resume.summary);

  // Experience
  (resume.experience || []).forEach(exp => {
    addStr(exp.company);
    addStr(exp.location);
    addStr(exp.dates);
    addStr(exp.title);
    addArr(exp.bullets);
  });

  // Education
  (resume.education || []).forEach(edu => {
    addStr(edu.school);
    addStr(edu.location);
    addStr(edu.dates);
    addStr(edu.degree);
    addArr(edu.bullets);
    const eduAny = edu as any
    addStr(eduAny.minor);
    addStr(eduAny.details);
  });

  // Additional information
  const add = (resume.additional || {}) as any;
  addStr(add.technical_skills);
  addStr(add.languages);
  addStr(add.certifications);
  addStr(add.awards);

  return total;
};

// === DYNAMIC SCALING (FIT TO SINGLE PAGE) ===
type ScaleMode = 'compact' | 'normal' | 'expanded';

const getDynamicStyles = (mode: ScaleMode, fitLevel: 0 | 1 | 2 = 0) => ({
  page: {
    fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel === 2 ? 8 : fitLevel === 1 ? 9 : 9) : 10,
    lineHeight: mode === 'expanded' ? 1.25 : mode === 'compact' ? (fitLevel >= 1 ? 1.08 : 1.12) : 1.15,
    padding: mode === 'expanded' ? 72 : mode === 'compact' ? (fitLevel === 2 ? 36 : fitLevel === 1 ? 48 : 56) : 64,
  },
  sectionsContainer: {
    justifyContent: mode === 'expanded' ? 'space-between' : 'flex-start',
  },
  section: {
    marginBottom: mode === 'expanded' ? 12 : mode === 'compact' ? (fitLevel >= 1 ? 6 : 8) : 10,
  },
  name: { fontSize: mode === 'expanded' ? 26 : mode === 'compact' ? (fitLevel === 2 ? 16 : fitLevel === 1 ? 18 : 20) : 22 },
  sectionTitle: { fontSize: mode === 'expanded' ? 14 : mode === 'compact' ? 11 : 12, borderBottomWidth: mode === 'compact' && fitLevel >= 1 ? 0.3 : 0.5 },
  contactInfo: { fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel >= 1 ? 9 : 10) : 10 },
  contactLine: { marginBottom: mode === 'expanded' ? 10 : mode === 'compact' ? (fitLevel >= 1 ? 5 : 6) : 8 },
  company: { fontSize: mode === 'expanded' ? 12 : mode === 'compact' ? (fitLevel >= 1 ? 10 : 11) : 11 },
  role: { fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel >= 1 ? 9 : 10) : 10 },
  dates: { fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel >= 1 ? 9 : 10) : 10 },
  bulletRow: { marginBottom: mode === 'expanded' ? 1.0 : mode === 'compact' ? (fitLevel >= 1 ? 0.4 : 0.6) : 0.8 },
  bullet: { width: mode === 'compact' ? (fitLevel >= 1 ? 4 : 5) : 7 },
  bulletText: {
    fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel >= 1 ? 9 : 10) : 10,
    lineHeight: mode === 'expanded' ? 1.25 : mode === 'compact' ? (fitLevel >= 1 ? 1.08 : 1.18) : 1.22,
    paddingLeft: mode === 'compact' ? (fitLevel >= 1 ? 1 : 2) : 2,
  },
  additionalText: {
    fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? (fitLevel >= 1 ? 9 : 10) : 10,
    lineHeight: mode === 'expanded' ? 1.25 : mode === 'compact' ? (fitLevel >= 1 ? 1.08 : 1.18) : 1.22,
  },
});

// Template variant styles
type TemplateVariant = 'modern' | 'classic' | 'executive'

const getTemplateStyles = (variant: TemplateVariant) => {
  switch (variant) {
    case 'modern':
      return {
        name: { letterSpacing: 1.5 },
        sectionTitle: { borderBottomColor: COLORS.mediumGray },
        contactLine: { color: COLORS.darkGray },
      }
    case 'executive':
      return {
        name: { letterSpacing: 1.8 },
        sectionTitle: { borderBottomWidth: 1, letterSpacing: 1.0 },
        contactLine: { letterSpacing: 0.15 },
      }
    case 'classic':
    default:
      return {
        name: {},
        sectionTitle: {},
        contactLine: {},
      }
  }
}

const renderBullets = (bullets: string[], dyn: any) =>
  bullets.map((b, i) => (
    <View key={i} style={[styles.bulletRow, dyn.bulletRow]} wrap={false}>
      <Text style={[styles.bullet, dyn.bullet]}>•</Text>
      <Text style={[styles.bulletText, dyn.bulletText]}>{b}</Text>
    </View>
  ));

export const ResumeTemplatePDF: React.FC<{ resume: OptimizedResume; template?: TemplateVariant }> = ({ resume, template = 'modern' }) => {
  if (!resume || !resume.header) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header} wrap={false}>
            <Text style={styles.name}>Resume Error</Text>
            <Text style={styles.contactInfo}>Invalid resume data provided</Text>
          </View>
        </Page>
      </Document>
    );
  }

  const contentLen = estimateContentLength(resume);
  const estLines = estimateTotalLines(resume);
  // Define fit levels based on estimated lines; aim for single-page
  const fitLevel: 0 | 1 | 2 = estLines > 120 ? 2 : estLines > 95 ? 1 : 0;
  const mode: ScaleMode = contentLen < 1200 ? 'expanded' : contentLen > 2200 ? 'compact' : 'normal';
  const dyn = getDynamicStyles(mode, fitLevel);
  const tmpl = getTemplateStyles(template)

  const rawSegments = (resume.header.contact || '').split(/\s*[|•·,]\s*/).filter(Boolean);
  const addressParts = (((resume.header as any).address) || '').split(/\s*,\s*/).filter(Boolean);
  const normalizedSegments = [...addressParts, ...rawSegments]
    .map(s => s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const NBSP = '\u00A0';
  const SEP = `${NBSP}•${NBSP}`;
  let contactLineText = normalizedSegments.join(SEP);
  contactLineText = contactLineText.replace(/,\s/g, `,${NBSP}`);
  const contactStyleOverride = {
    fontSize: contactLineText.length > 80 ? (fitLevel >= 1 ? 8 : 9) : 10,
    letterSpacing: contactLineText.length > 80 ? 0.1 : 0.2,
  } as const;

  return (
    <Document>
      <Page size="A4" style={[styles.page, dyn.page]}>
        {/* HEADER */}
        <View style={styles.header} wrap={false}>
          <Text style={[styles.name, dyn.name, tmpl.name]}>{resume.header.name}</Text>
          <View style={styles.contactGroup}>
            {contactLineText && (
              <Text style={[styles.contactLine, dyn.contactLine, contactStyleOverride, tmpl.contactLine]} wrap={false}>{contactLineText}</Text>
            )}
          </View>
        </View>

        {/* SECTIONS CONTAINER */}
        <View style={[styles.sectionsContainer, mode === 'expanded' ? styles.sectionsContainerExpanded : null]}>
          {/* SUMMARY */}
          {resume.summary && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle, tmpl.sectionTitle]}>PROFESSIONAL SUMMARY</Text>
              <Text style={[styles.summary, dyn.additionalText]}>{resume.summary}</Text>
            </View>
          )}

          {/* EXPERIENCE */}
          {resume.experience && resume.experience.length > 0 && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle, tmpl.sectionTitle]}>PROFESSIONAL EXPERIENCE</Text>
              {resume.experience.map((exp, i) => (
                <View key={i} style={styles.experienceItem}>
                  <View style={styles.companyRow}>
                    <Text style={[styles.company, dyn.company]}>{exp.company}</Text>
                    <Text style={styles.location}>{exp.location}</Text>
                  </View>
                  <View style={styles.roleRow}>
                    <Text style={[styles.role, dyn.role]}>{exp.title}</Text>
                    <Text style={[styles.dates, dyn.dates]}>{exp.dates}</Text>
                  </View>
                  {exp.bullets && exp.bullets.length > 0 && renderBullets(exp.bullets, dyn)}
                </View>
              ))}
            </View>
          )}

          {/* EDUCATION */}
          {resume.education && resume.education.length > 0 && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle, tmpl.sectionTitle]}>EDUCATION</Text>
              {resume.education.map((edu, i) => (
                <View key={i} style={styles.educationItem}>
                  <View style={styles.companyRow}>
                    <Text style={styles.school}>{edu.school}</Text>
                    <Text style={styles.location}>{edu.location}</Text>
                  </View>
                  <View style={styles.roleRow}>
                    <Text style={styles.degree}>{edu.degree}</Text>
                    <Text style={[styles.dates, dyn.dates]}>{edu.dates}</Text>
                  </View>
                  {(edu as any).minor && (
                    <Text style={styles.educationDetails}>• {(edu as any).minor}</Text>
                  )}
                  {(edu as any).details && (
                    <Text style={styles.educationDetails}>• {(edu as any).details}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ADDITIONAL */}
          {resume.additional && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle, tmpl.sectionTitle]}>ADDITIONAL INFORMATION</Text>
              {fitLevel >= 2 ? (
                // Compact inline layout to reduce vertical space
                <Text style={[styles.additionalText, dyn.additionalText]}>
                  {resume.additional.technical_skills ? `Technical Skills: ${resume.additional.technical_skills}` : ''}
                  {resume.additional.languages ? `${SEP}Languages: ${resume.additional.languages}` : ''}
                  {resume.additional.certifications ? `${SEP}Certifications: ${resume.additional.certifications}` : ''}
                  {resume.additional.awards ? `${SEP}Awards: ${resume.additional.awards}` : ''}
                </Text>
              ) : (
                <>
                  {resume.additional.technical_skills && (
                    <View style={styles.additionalSection}>
                      <Text style={styles.additionalTitle}>Technical Skills:</Text>
                      <Text style={[styles.additionalText, dyn.additionalText]}>{resume.additional.technical_skills}</Text>
                    </View>
                  )}
                  {resume.additional.languages && (
                    <View style={styles.additionalSection}>
                      <Text style={styles.additionalTitle}>Languages:</Text>
                      <Text style={[styles.additionalText, dyn.additionalText]}>{resume.additional.languages}</Text>
                    </View>
                  )}
                  {resume.additional.certifications && (
                    <View style={styles.additionalSection}>
                      <Text style={styles.additionalTitle}>Certifications:</Text>
                      <Text style={[styles.additionalText, dyn.additionalText]}>{resume.additional.certifications}</Text>
                    </View>
                  )}
                  {resume.additional.awards && (
                    <View style={styles.additionalSection}>
                      <Text style={styles.additionalTitle}>Awards:</Text>
                      <Text style={[styles.additionalText, dyn.additionalText]}>{resume.additional.awards}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};
