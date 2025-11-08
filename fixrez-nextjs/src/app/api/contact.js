import dotenv from 'dotenv';

// Load local env in dev; Vercel injects env in production
dotenv.config({ path: '.env.local' });

const EMAIL_TO = process.env.CONTACT_TO_EMAIL || 'hello@summitpixels.com';
const MIN_ELAPSED_MS = 2500;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      subject,
      message,
      honey, // honeypot field from client (should be empty)
      elapsedMs, // ms spent before submit
      challengeA,
      challengeB,
      challengeAnswer,
    } = req.body || {};

    // Basic validation
    if ((honey || '').trim()) {
      return res.status(400).json({ success: false, error: 'Invalid submission' });
    }
    if (typeof elapsedMs !== 'number' || elapsedMs < MIN_ELAPSED_MS) {
      return res.status(400).json({ success: false, error: 'Please wait a moment before submitting.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    if (!message || (message || '').trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Message must be at least 10 characters' });
    }
    const ans = parseInt(String(challengeAnswer || ''), 10);
    if (Number.isNaN(ans) || typeof challengeA !== 'number' || typeof challengeB !== 'number' || ans !== challengeA + challengeB) {
      return res.status(400).json({ success: false, error: 'Failed anti-spam challenge' });
    }

    const finalSubject = (subject && subject.trim()) || 'Contact from FixRez AI';
    const textContent = `New contact submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${finalSubject}\n\nMessage:\n${message}`;

    // Attempt email via Resend if configured; otherwise accept without sending
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'FixRez <onboarding@resend.dev>',
            to: EMAIL_TO,
            subject: finalSubject,
            text: textContent,
          })
        });

        const ok = resp.ok;
        let data;
        try { data = await resp.json(); } catch { data = null; }
        if (!ok) {
          const details = data && (data.error || data.message) ? (data.error || data.message) : `Status ${resp.status}`;
          console.error('Contact email send failed:', details);
          return res.status(502).json({ success: false, error: 'Failed to send email', details });
        }

        return res.status(200).json({ success: true, queued: true, provider: 'resend', id: data?.id || null });
      } catch (err) {
        console.error('Contact email provider error:', err?.message || err);
        return res.status(502).json({ success: false, error: 'Email provider error', details: err?.message || 'Unknown error' });
      }
    }

    // No provider configured; accept and log for visibility
    console.log('Contact submission accepted (no email provider configured):', { name, email, subject: finalSubject, messageLen: (message || '').length });
    return res.status(200).json({ success: true, queued: false, provider: null, note: 'Email provider not configured' });
  } catch (error) {
    console.error('Contact handler error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Server error', details: error?.message || 'Unknown error' });
  }
}

