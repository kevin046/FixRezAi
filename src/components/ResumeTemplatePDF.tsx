import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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

// === DYNAMIC SCALING (FILL FULL A4 WHEN CONTENT IS SHORT) ===

type ScaleMode = 'compact' | 'normal' | 'expanded';

const estimateContentLength = (resume: ResumeData) => {
  const expText = (resume.experience || [])
    .map(e => `${e.company}${e.title}${e.location}${e.dates}${(e.bullets||[]).join('')}`)
    .join('');
  const eduText = (resume.education || [])
    .map(e => `${e.school}${e.degree}${e.location}${e.dates}${e.details||''}${e.minor||''}`)
    .join('');
  const addText = Object.values(resume.additional || {}).join('');
  return (
    (resume.summary || '').length + expText.length + eduText.length + addText.length
  );
};

const getDynamicStyles = (mode: ScaleMode) => ({
  page: {
    fontSize: mode === 'expanded' ? 11 : mode === 'compact' ? 9 : 10,
    lineHeight: mode === 'expanded' ? 1.25 : mode === 'compact' ? 1.12 : 1.15,
  },
  sectionsContainer: {
    justifyContent: mode === 'expanded' ? 'space-between' : 'flex-start',
  },
  section: {
    marginBottom: mode === 'expanded' ? 12 : mode === 'compact' ? 6 : 10,
  },
  name: { fontSize: mode === 'expanded' ? 26 : mode === 'compact' ? 18 : 22 },
  sectionTitle: { fontSize: mode === 'expanded' ? 14 : 12 },
  contactInfo: { fontSize: mode === 'expanded' ? 11 : 10 },
  contactLine: { marginBottom: mode === 'expanded' ? 10 : mode === 'compact' ? 6 : 8 },
  company: { fontSize: mode === 'expanded' ? 12 : 11 },
  role: { fontSize: mode === 'expanded' ? 11 : 10 },
  dates: { fontSize: mode === 'expanded' ? 11 : 10 },
  bulletText: {
    fontSize: mode === 'expanded' ? 11 : 10,
    lineHeight: mode === 'expanded' ? 1.25 : 1.25,
  },
  additionalText: {
    fontSize: mode === 'expanded' ? 11 : 10,
    lineHeight: mode === 'expanded' ? 1.25 : 1.22,
  },
});

// === RESUME DATA INTERFACE ===
interface ResumeData {
  header: { name: string; contact: string; address?: string };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    location: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    location: string;
    dates: string;
    minor?: string;
    details?: string;
  }>;
  additional: {
    technical_skills?: string;
    languages?: string;
    certifications?: string;
    awards?: string;
  };
}

const renderBullets = (bullets: string[], dyn: any) =>
  bullets.map((b, i) => (
    <View key={i} style={styles.bulletRow} wrap={false}>
      <Text style={styles.bullet}>•</Text>
      <Text style={[styles.bulletText, dyn.bulletText]}>{b}</Text>
    </View>
  ));

export const ResumeTemplatePDF: React.FC<{ resume: ResumeData }> = ({ resume }) => {
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
  const mode: ScaleMode = contentLen < 1200 ? 'expanded' : contentLen > 2200 ? 'compact' : 'normal';
  const dyn = getDynamicStyles(mode);
  const rawSegments = (resume.header.contact || '').split(/\s*[|•·,]\s*/).filter(Boolean);
  const addressParts = (resume.header.address || '').split(/\s*,\s*/).filter(Boolean);
  const normalizedSegments = [...addressParts, ...rawSegments]
    .map(s => s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const NBSP = '\u00A0';
  const SEP = `${NBSP}•${NBSP}`;
  let contactLineText = normalizedSegments.join(SEP);
  // Prevent wrapping between city and province
  contactLineText = contactLineText.replace(/,\s/g, `,${NBSP}`);
  // Reduce font size slightly for very long contact lines to avoid wrapping
  const contactStyleOverride = {
    fontSize: contactLineText.length > 80 ? 9 : 10,
    letterSpacing: contactLineText.length > 80 ? 0.1 : 0.2,
  } as const;

  return (
    <Document>
      <Page size="A4" style={[styles.page, dyn.page]}>
        {/* HEADER */}
        <View style={styles.header} wrap={false}>
          <Text style={[styles.name, dyn.name]}>{resume.header.name}</Text>
          <View style={styles.contactGroup}>
            {contactLineText && (
              <Text style={[styles.contactLine, dyn.contactLine, contactStyleOverride]} wrap={false}>{contactLineText}</Text>
            )}
          </View>
        </View>

        {/* SECTIONS CONTAINER */}
        <View style={[styles.sectionsContainer, mode === 'expanded' ? styles.sectionsContainerExpanded : null]}>
          {/* SUMMARY */}
          {resume.summary && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>PROFESSIONAL SUMMARY</Text>
              <Text style={styles.summary}>{resume.summary}</Text>
            </View>
          )}

          {/* EXPERIENCE */}
          {resume.experience && resume.experience.length > 0 && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>PROFESSIONAL EXPERIENCE</Text>
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
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>EDUCATION</Text>
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
                  {edu.minor && (
                    <Text style={styles.educationDetails}>• {edu.minor}</Text>
                  )}
                  {edu.details && (
                    <Text style={styles.educationDetails}>• {edu.details}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ADDITIONAL */}
          {resume.additional && (
            <View style={[styles.section, dyn.section]}>
              <Text style={[styles.sectionTitle, dyn.sectionTitle]}>ADDITIONAL INFORMATION</Text>
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
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};
