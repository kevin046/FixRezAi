import optimize from '../api/optimize.js';

const req = {
  method: 'POST',
  body: {
    resumeText: `Jane Doe\nSoftware Engineer\nEmail: jane@example.com\n\nExperience:\n- Built React apps and Node APIs\n- Improved performance by 25%\n\nSkills: JavaScript, React, Node.js, TypeScript`,
    jobDescription: 'Frontend Engineer role focusing on React, TypeScript, performance, accessibility',
    options: { tone: 'professional', style: 'concise', industry: 'software', atsLevel: 'high' },
    prompt: undefined
  },
  user: { email: 'test@local' }
};

const res = {
  code: 200,
  status(code) { this.code = code; return this; },
  json(obj) { console.log('status', this.code || 200); console.log(JSON.stringify(obj, null, 2)); }
};

(async () => {
  try {
    await optimize(req, res);
  } catch (e) {
    console.error('Runner error:', e?.message);
  }
})();