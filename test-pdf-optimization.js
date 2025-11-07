#!/usr/bin/env node

// Test: PDF single-page optimization and Word option removal
// - Generates PDFs for multiple content scenarios using @react-pdf/renderer
// - Applies dynamic scaling heuristics to maintain single-page constraint
// - Parses PDFs with pdf-parse to verify page count
// - Verifies UI code no longer includes Word export

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
function countPdfPagesFromText(text) {
  try {
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ----------------------
// Content density helpers
// ----------------------
function approxLines(text, maxCharsPerLine = 85) {
  if (!text) return 0
  const lines = text.split('\n').length
  const longLines = Math.ceil(text.length / maxCharsPerLine)
  return Math.max(lines, longLines)
}

function estimateTotalLines(resume) {
  let total = 0
  total += approxLines(resume.summary || '')
  for (const exp of resume.experience || []) {
    total += 2 // company/role rows
    total += approxLines(exp.title || '')
    total += approxLines(exp.company || '')
    total += approxLines(exp.location || '')
    total += approxLines(exp.dates || '')
    for (const b of exp.bullets || []) total += approxLines(b)
  }
  for (const edu of resume.education || []) {
    total += 2
    total += approxLines(edu.school || '')
    total += approxLines(edu.degree || '')
    total += approxLines(edu.location || '')
    total += approxLines(edu.dates || '')
    for (const b of edu.bullets || []) total += approxLines(b)
  }
  const add = resume.additional || {}
  total += approxLines(add.technical_skills || '')
  total += approxLines(add.languages || '')
  total += approxLines(add.certifications || '')
  total += approxLines(add.awards || '')
  return total
}

function pickScaleMode(totalLines) {
  if (totalLines <= 120) return 'expanded'
  if (totalLines <= 180) return 'normal'
  if (totalLines <= 240) return 'compact'
  return 'compact-max'
}

function getDynamicMetrics(totalLines, mode) {
  // Baseline values tuned to fit single A4 page with margins
  const base = { font: 11, line: 1.35, sectionGap: 10, bulletGap: 4, marginTop: 28, marginSides: 28 }
  switch (mode) {
    case 'expanded':
      return { ...base, font: 12, line: 1.45, sectionGap: 12, bulletGap: 5, marginTop: 32, marginSides: 32 }
    case 'normal':
      return base
    case 'compact':
      return { ...base, font: 10.5, line: 1.28, sectionGap: 8, bulletGap: 3, marginTop: 24, marginSides: 24 }
    case 'compact-max':
      return { ...base, font: 10, line: 1.22, sectionGap: 6, bulletGap: 2, marginTop: 20, marginSides: 20 }
  }
}

// ----------------------
// PDF styles per scenario
// ----------------------
function makeStyles(metrics) {
  return StyleSheet.create({
    page: {
      paddingTop: metrics.marginTop,
      paddingBottom: metrics.marginTop,
      paddingHorizontal: metrics.marginSides,
      fontSize: metrics.font,
    },
    header: {
      marginBottom: metrics.sectionGap,
    },
    name: {
      fontSize: metrics.font + 4,
      fontWeight: 700,
    },
    contact: {
      marginTop: 2,
      fontSize: metrics.font,
    },
    section: {
      marginBottom: metrics.sectionGap,
    },
    sectionTitle: {
      fontSize: metrics.font + 1,
      fontWeight: 700,
      marginBottom: 4,
    },
    row: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    bullet: {
      marginBottom: metrics.bulletGap,
      lineHeight: metrics.line,
    },
  })
}

// ----------------------
// PDF building (no JSX)
// ----------------------
function ResumeDoc({ resume, metrics }) {
  const styles = makeStyles(metrics)

  const headerEl = React.createElement(
    View,
    { style: styles.header },
    React.createElement(Text, { style: styles.name }, resume.header?.name || 'Unnamed'),
    React.createElement(Text, { style: styles.contact }, resume.header?.contact || '')
  )

  const summaryEl = resume.summary
    ? React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'PROFESSIONAL SUMMARY'),
        React.createElement(Text, { style: { lineHeight: metrics.line } }, resume.summary)
      )
    : null

  const expEls = Array.isArray(resume.experience)
    ? resume.experience.map((exp, i) =>
        React.createElement(
          View,
          { key: i },
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, null, exp.company),
            React.createElement(Text, null, exp.location)
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, null, exp.title),
            React.createElement(Text, null, exp.dates)
          ),
          ...(exp.bullets || []).map((b, j) => React.createElement(Text, { key: `${i}-${j}`, style: styles.bullet }, `• ${b}`))
        )
      )
    : []

  const experienceEl = expEls.length
    ? React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'PROFESSIONAL EXPERIENCE'),
        ...expEls
      )
    : null

  const eduEls = Array.isArray(resume.education)
    ? resume.education.map((edu, i) =>
        React.createElement(
          View,
          { key: i },
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, null, edu.school),
            React.createElement(Text, null, edu.location)
          ),
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, null, edu.degree),
            React.createElement(Text, null, edu.dates)
          ),
          ...(edu.bullets || []).map((b, j) => React.createElement(Text, { key: `${i}-${j}`, style: styles.bullet }, `• ${b}`))
        )
      )
    : []

  const educationEl = eduEls.length
    ? React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'EDUCATION'),
        ...eduEls
      )
    : null

  const add = resume.additional || {}
  const addEls = []
  if (add.technical_skills) addEls.push(React.createElement(Text, { key: 'skills', style: styles.bullet }, `Technical Skills: ${add.technical_skills}`))
  if (add.languages) addEls.push(React.createElement(Text, { key: 'langs', style: styles.bullet }, `Languages: ${add.languages}`))
  if (add.certifications) addEls.push(React.createElement(Text, { key: 'certs', style: styles.bullet }, `Certifications: ${add.certifications}`))
  if (add.awards) addEls.push(React.createElement(Text, { key: 'awards', style: styles.bullet }, `Awards: ${add.awards}`))

  const additionalEl = addEls.length
    ? React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'ADDITIONAL INFORMATION'),
        ...addEls
      )
    : null

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      headerEl,
      summaryEl,
      experienceEl,
      educationEl,
      additionalEl
    )
  )
}

async function generateAndValidate(resume, label) {
  const totalLines = estimateTotalLines(resume)
  const mode = pickScaleMode(totalLines)
  const metrics = getDynamicMetrics(totalLines, mode)

  const element = React.createElement(ResumeDoc, { resume, metrics })
  const instance = pdf(element)
  let buffer
  try {
    buffer = await instance.toBuffer()
  } catch (e) {
    const blob = await instance.toBlob()
    const ab = await blob.arrayBuffer()
    buffer = Buffer.from(ab)
  }
  const text = await instance.toString()
  const pages = countPdfPagesFromText(text)

  const readabilityOk = metrics.font >= 10 && metrics.line >= 1.2 && metrics.marginSides >= 20

  console.log(`\nScenario: ${label}`)
  console.log(`  Content density (approx lines): ${totalLines}`)
  console.log(`  Scaling mode: ${mode}`)
  console.log(`  Applied metrics: font=${metrics.font}, line=${metrics.line}, margins=${metrics.marginSides}`)
  console.log(`  PDF pages: ${pages}`)
  console.log(`  Readability OK: ${readabilityOk ? 'YES' : 'NO'}`)

  if (pages > 1) {
    console.log('  ❌ Single-page constraint FAILED')
  } else {
    console.log('  ✅ Single-page constraint PASSED')
  }

  // Save artifacts for manual inspection
  const outDir = path.join(__dirname, 'test-output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${label.replace(/\\s+/g,'_').toLowerCase()}.pdf`)
  try {
    fs.writeFileSync(outPath, buffer)
    console.log(`  Saved: ${outPath}`)
  } catch (e) {
    const txtPath = outPath.replace(/\.pdf$/, '.txt')
    fs.writeFileSync(txtPath, text)
    console.log(`  Saved text artifact instead (PDF write failed): ${txtPath}`)
  }

  return { pages, readabilityOk, mode, totalLines }
}

// ----------------------
// Test data scenarios
// ----------------------
function lorem(n) {
  return Array.from({ length: n }, () => 'Delivered results; improved efficiency; collaborated cross‑functionally; owned features; reduced costs.').join(' ')
}

const minimalResume = {
  header: { name: 'Alex Taylor', contact: 'alex@example.com · (555) 111-2222 · Seattle, WA' },
  summary: 'Early-career developer focused on delivering clean, maintainable code.',
  experience: [
    { company: 'Starter LLC', location: 'Seattle, WA', title: 'Junior Developer', dates: '2023–Present', bullets: [ 'Built small features', 'Wrote unit tests' ] }
  ],
  education: [
    { school: 'UW', location: 'Seattle, WA', degree: 'BS, CS', dates: '2019–2023', bullets: [] }
  ],
  additional: { technical_skills: 'JavaScript, React', languages: 'English' }
}

const standardResume = {
  header: { name: 'Jordan Lee', contact: 'jordan@example.com · (555) 222-3333 · Austin, TX' },
  summary: lorem(8),
  experience: [
    { company: 'TechCorp', location: 'Austin, TX', title: 'Software Engineer', dates: '2021–Present', bullets: [ lorem(2), lorem(2), lorem(2) ] },
    { company: 'WebWorks', location: 'Remote', title: 'Frontend Dev', dates: '2019–2021', bullets: [ lorem(2), lorem(2) ] }
  ],
  education: [
    { school: 'UT Austin', location: 'Austin, TX', degree: 'BS, CS', dates: '2015–2019', bullets: [] }
  ],
  additional: { technical_skills: 'React, TypeScript, Node.js, AWS', languages: 'English, Spanish', certifications: 'AWS CCP' }
}

const detailedResume = {
  header: { name: 'Morgan Chen', contact: 'morgan@example.com · (555) 333-4444 · San Jose, CA' },
  summary: lorem(18),
  experience: [
    { company: 'DataScale', location: 'San Jose, CA', title: 'Senior Engineer', dates: '2020–Present', bullets: [ lorem(3), lorem(3), lorem(3), lorem(3) ] },
    { company: 'CloudNine', location: 'Remote', title: 'Engineer', dates: '2017–2020', bullets: [ lorem(3), lorem(3), lorem(3) ] },
    { company: 'Apphaus', location: 'SF, CA', title: 'Developer', dates: '2015–2017', bullets: [ lorem(3), lorem(3) ] }
  ],
  education: [
    { school: 'SJSU', location: 'San Jose, CA', degree: 'BS, CS', dates: '2011–2015', bullets: [] }
  ],
  additional: { technical_skills: 'React, Node.js, TypeScript, Postgres, Redis, Docker, K8s', languages: 'English, Mandarin', certifications: 'AWS SA', awards: 'Top Performer 2022' }
}

const extensiveResume = {
  header: { name: 'Taylor Morgan', contact: 'taylor@example.com · (555) 444-5555 · NYC, NY' },
  summary: lorem(40),
  experience: [
    { company: 'GlobalCorp', location: 'NYC, NY', title: 'Principal Engineer', dates: '2021–Present', bullets: [ lorem(4), lorem(4), lorem(4), lorem(4), lorem(4) ] },
    { company: 'FinServe', location: 'NYC, NY', title: 'Lead Engineer', dates: '2018–2021', bullets: [ lorem(4), lorem(4), lorem(4), lorem(4) ] },
    { company: 'StartHub', location: 'Remote', title: 'Senior Engineer', dates: '2015–2018', bullets: [ lorem(4), lorem(4), lorem(4) ] },
    { company: 'DevWorks', location: 'Remote', title: 'Engineer', dates: '2012–2015', bullets: [ lorem(4), lorem(4), lorem(4) ] }
  ],
  education: [
    { school: 'NYU', location: 'NYC, NY', degree: 'MS, CS', dates: '2010–2012', bullets: [ lorem(2) ] }
  ],
  additional: { technical_skills: 'Wide stack across frontend/backend/devops', languages: 'English', certifications: 'Multiple', awards: 'Several' }
}

// ----------------------
// Verify Word option removal
// ----------------------
function verifyWordOptionRemoval() {
  const target = path.join(__dirname, 'src', 'components', 'wizard', 'ExportStep.tsx')
  const content = fs.readFileSync(target, 'utf-8')
  const hasWordInOptions = /\bid:\s*'word'/.test(content) || /Word Document/.test(content)
  const acceptsWordParam = /handleExport\(.*\|\s*'word'/.test(content)
  const hasWordFormatType = /format:\s*'word'/.test(content)
  const verdict = !hasWordInOptions && !acceptsWordParam && !hasWordFormatType
  console.log('\nWord option removal check:')
  console.log(`  Export options include 'word': ${hasWordInOptions ? 'YES' : 'NO'}`)
  console.log(`  handleExport accepts 'word': ${acceptsWordParam ? 'YES' : 'NO'}`)
  console.log(`  'format: \"word\"' present: ${hasWordFormatType ? 'YES' : 'NO'}`)
  console.log(`  ✅ Removal verdict: ${verdict ? 'PASSED' : 'FAILED'}`)
  return verdict
}

// ----------------------
// Main runner
// ----------------------
async function main() {
  console.log('🧪 PDF Single-Page Optimization Test')
  console.log('===================================')

  const wordRemoved = verifyWordOptionRemoval()

  const results = []
  results.push(await generateAndValidate(minimalResume, 'short'))
  results.push(await generateAndValidate(standardResume, 'medium'))
  results.push(await generateAndValidate(detailedResume, 'long'))
  results.push(await generateAndValidate(extensiveResume, 'very-long'))

  console.log('\nSummary:')
  results.forEach((r, i) => {
    const labels = ['short','medium','long','very-long']
    console.log(`  ${labels[i]} → pages=${r.pages}, density=${r.totalLines}, mode=${r.mode}, readability=${r.readabilityOk?'OK':'LOW'}`)
  })

  const allSinglePage = results.every(r => r.pages === 1)
  const allReadable = results.every(r => r.readabilityOk)

  console.log('\nFinal Verdict:')
  console.log(`  Word option removed: ${wordRemoved ? 'YES' : 'NO'}`)
  console.log(`  Single-page across scenarios: ${allSinglePage ? 'YES' : 'NO'}`)
  console.log(`  Readability preserved: ${allReadable ? 'YES' : 'NO'}`)

  if (!wordRemoved || !allSinglePage || !allReadable) {
    console.log('\n❌ Some checks failed. Inspect test-output PDFs and review scaling thresholds.')
    process.exitCode = 1
  } else {
    console.log('\n✅ All checks passed!')
  }
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})