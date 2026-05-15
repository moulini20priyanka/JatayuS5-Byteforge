// backend/services/emailService.js
// Sends emails using templates stored in the email_templates DB table.
// Falls back to hardcoded HTML if the DB template is missing or inactive.
//
// FIXES APPLIED:
//   1. loadTemplate  — uses ORDER BY id DESC LIMIT 1 so the most-recently
//      saved row wins. Your DB has duplicate template_key rows (old seeds
//      1-2 + correct rows 3-4); without LIMIT the broken seed was used.
//   2. interpolate   — missing vars now render as '' instead of '{{key}}'.
//   3. sendMail      — added encoding:'utf-8' + Content-Type charset header
//      so emojis and em-dashes survive SMTP transport on all mail clients.
//   4. Fallback HTML — all emojis replaced with HTML numeric entities
//      (&#x...) so they never depend on the transport charset at all.
//   5. Null-safety   — recruiterCompany / examRole / examDuration guarded
//      against null so the email renders cleanly when those fields are empty.

const nodemailer = require('nodemailer');
const db         = require('../config/db');

// ─── Mailer setup ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
  },
});

// ─── Helper: load a template from DB ─────────────────────────────────────────
// FIX 1: ORDER BY id DESC LIMIT 1 ensures we always get the newest row when
// multiple rows share the same template_key (e.g. recruiter_signup ids 1 & 3,
// exam_request ids 2 & 4). The old seeds had corrupted ? characters; the newer
// rows inserted through the admin UI are correct.
async function loadTemplate(templateKey) {
  try {
    const [rows] = await db.query(
      `SELECT subject, body_html, is_active
         FROM email_templates
        WHERE template_key = ? AND is_active = 1
        ORDER BY id DESC
        LIMIT 1`,
      [templateKey]
    );
    if (rows.length) return rows[0];
  } catch (err) {
    console.error(`[EmailService] Could not load template "${templateKey}":`, err);
  }
  return null;
}

// ─── Helper: load platform settings ──────────────────────────────────────────
async function loadPlatformSettings() {
  try {
    const [rows] = await db.query('SELECT `key`, `value` FROM platform_settings');
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  } catch (_) {
    return {};
  }
}

// ─── Helper: replace {{variable}} placeholders ────────────────────────────────
// FIX 2: Coerce missing vars to '' so recipients never see raw {{placeholders}}.
function interpolate(str, vars) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

// ─── Fallback HTML builders ───────────────────────────────────────────────────
// FIX 4: All emojis are written as HTML numeric entities (&#x...) so they are
// 100% safe regardless of SMTP / client charset handling. Special punctuation
// (em-dash, copyright, arrows) also uses entities.

// ── Student Welcome ───────────────────────────────────────────────────────────
function buildStudentWelcomeHtml({ studentName, studentEmail, tempPassword, loginUrl, platformName }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${platformName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:#f4f6fb;line-height:1.6;color:#2d3748}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:36px 28px;text-align:center;color:#fff}
    .header h1{margin:0 0 6px;font-size:22px;font-weight:700}
    .header p{margin:0;opacity:.88;font-size:14px}
    .badge{display:inline-block;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600;margin-bottom:14px;letter-spacing:.3px}
    .body{padding:32px 28px 24px}
    .greeting{font-size:16px;color:#1e3a8a;font-weight:600;margin-bottom:10px}
    .text{font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px}
    .cred-box{background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:20px 22px;margin-bottom:20px}
    .cred-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e0e7ff}
    .cred-row:last-child{border-bottom:none}
    .cred-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
    .cred-value{font-size:14px;color:#1e3a8a;font-weight:700;font-family:'Courier New',monospace;letter-spacing:.08em;word-break:break-all}
    .warn-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:22px}
    .warn-box p{margin:0;font-size:13px;color:#92400e;line-height:1.6}
    .btn-wrap{text-align:center;margin-bottom:10px}
    .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:700;font-size:14px}
    .footer{padding:18px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#9ca3af;line-height:1.7}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="badge">&#x2705; STUDENT ACCOUNT CREATED</div>
      <h1>Welcome to the Student Portal</h1>
      <p>Your account is ready &#x2014; please set your password to get started</p>
    </div>
    <div class="body">
      <div class="greeting">Hi ${studentName},</div>
      <p class="text">
        Your student account has been created on <strong>${platformName}</strong>.
        Use the details below to log in for the first time. You will be asked to
        set a new password before entering the platform.
      </p>
      <div class="cred-box">
        <div class="cred-row">
          <span class="cred-label">YOUR LOGIN CREDENTIALS</span>
          <span></span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Registered Email</span>
          <span class="cred-value">${studentEmail}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password</span>
          <span class="cred-value">${tempPassword}</span>
        </div>
      </div>
      <div class="warn-box">
        <p>&#x26A0;&#xFE0F; <strong>Action Required &#x2014; Set Your Password</strong><br>
        On your <strong>first login</strong>, you will be prompted to enter this temporary
        password and create a new secure password. This temporary password will no longer
        work after you have set a new one.</p>
      </div>
      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Log In &amp; Set Password &#x2192;</a>
      </div>
    </div>
    <div class="footer">
      If you did not expect this email, please ignore it or contact your administrator.<br>
      &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

// ── Exam Invitation ───────────────────────────────────────────────────────────
function buildExamInvitationHtml({ studentName, examKey, examTitle, examDuration, examDate, examTime, examUrl, platformName }) {
  const metaParts = [
    examTitle    ? `&#x1F4CB; <strong>Exam Title:</strong> ${examTitle}` : '',
    examDuration ? `&#x23F1;&#xFE0F; <strong>Duration:</strong> ${examDuration} minutes` : '',
    (examDate || examTime)
      ? `&#x1F4C5; <strong>Scheduled:</strong> ${[examDate, examTime].filter(Boolean).join(' at ')}`
      : '',
  ].filter(Boolean).join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exam Invitation &#x2014; ${examTitle}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:#f4f6fb;line-height:1.6;color:#2d3748}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:36px 28px;text-align:center;color:#fff}
    .header h1{margin:0 0 6px;font-size:22px;font-weight:700}
    .header p{margin:0;opacity:.88;font-size:14px}
    .body{padding:32px 28px 24px}
    .greeting{font-size:16px;color:#1e3a8a;font-weight:600;margin-bottom:10px}
    .text{font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px}
    .key-box{background:#f8faff;border:2px dashed #93c5fd;border-radius:12px;padding:22px;text-align:center;margin-bottom:20px}
    .key-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;font-weight:600}
    .key-value{font-size:30px;font-weight:900;color:#1e3a8a;font-family:'Courier New',monospace;letter-spacing:.15em;word-break:break-all}
    .meta-box{background:#f8faff;border:1px solid #dbeafe;border-radius:8px;padding:16px 18px;margin-bottom:20px;font-size:14px;color:#374151;line-height:2.1}
    .instr-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px 18px;margin-bottom:22px}
    .instr-title{font-size:13px;color:#92400e;font-weight:700;display:block;margin-bottom:8px}
    .instr-box ul{margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:2}
    .btn-wrap{text-align:center;margin-bottom:10px}
    .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:700;font-size:14px}
    .closer{text-align:center;font-size:13px;color:#6b7280;margin-top:18px}
    .footer{padding:18px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#9ca3af;line-height:1.7}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>&#x1F4DA; Exam Portal</h1>
      <p>Your official exam invitation</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${studentName},</div>
      <p class="text">
        You have been scheduled to take an important exam. Please use the unique
        access key below to begin your test.
      </p>
      <div class="key-box">
        <div class="key-label">ACCESS KEY</div>
        <div class="key-value">${examKey}</div>
      </div>
      ${metaParts ? `<div class="meta-box">${metaParts}</div>` : ''}
      <div class="instr-box">
        <span class="instr-title">&#x1F4CC; Important Instructions</span>
        <ul>
          <li>Keep your access key secure and confidential</li>
          <li>Enter this key on the exam portal to start your test</li>
          <li>Ensure you have a stable internet connection</li>
          <li>Contact your administrator if you encounter any issues</li>
        </ul>
      </div>
      <div class="btn-wrap">
        <a href="${examUrl}" class="btn">Start Exam Portal</a>
      </div>
      <p class="closer">We wish you the very best with your exam. You&#x2019;ve got this! &#x2728;</p>
    </div>
    <div class="footer">
      This is an automated message from ${platformName}. Please do not reply directly to this email.<br>
      &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

// ── Recruiter Signup Admin Alert ──────────────────────────────────────────────
function buildRecruiterSignupHtml({ adminName, recruiterName, recruiterEmail, recruiterCompany, signupTime, approvalsUrl, platformName }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Recruiter Sign-Up</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#f4f6fb}
    .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:32px 24px;text-align:center;color:#fff}
    .header h1{margin:0 0 6px;font-size:22px;font-weight:700}
    .header p{margin:0;opacity:.85;font-size:14px}
    .body{padding:28px}
    .greeting{font-size:16px;color:#1e3a8a;font-weight:600;margin-bottom:10px}
    .text{font-size:14px;color:#374151;line-height:1.6;margin-bottom:18px}
    .info-box{background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:18px 20px;margin-bottom:18px}
    .info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #e0e7ff}
    .info-row:last-child{border-bottom:none}
    .info-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
    .info-value{font-size:14px;color:#1e3a8a;font-weight:700;word-break:break-all}
    .alert-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:22px}
    .alert-box p{margin:0;font-size:13px;color:#9a3412;line-height:1.6}
    .btn-wrap{text-align:center;margin-bottom:8px}
    .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px}
    .footer{padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#9ca3af;line-height:1.7}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>&#x1F464; New Recruiter Sign-Up</h1>
      <p>Action required &#x2014; pending approval</p>
    </div>
    <div class="body">
      <div class="greeting">Hi ${adminName},</div>
      <p class="text">
        A new recruiter has registered on <strong>${platformName}</strong> and is
        awaiting your approval before they can access the platform.
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value">${recruiterName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${recruiterEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${recruiterCompany || '&#x2014;'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Signed Up At</span>
          <span class="info-value">${signupTime}</span>
        </div>
      </div>
      <div class="alert-box">
        <p>&#x23F3; <strong>Pending Approval</strong><br>
        This recruiter cannot log in or create exams until you approve their account.
        Please review and take action from the admin panel.</p>
      </div>
      <div class="btn-wrap">
        <a href="${approvalsUrl}" class="btn">Review &amp; Approve &#x2192;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated alert from ${platformName}. Please do not reply directly to this email.<br>
      &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

// ── Exam Request Admin Alert ──────────────────────────────────────────────────
function buildExamRequestHtml({ adminName, examTitle, examRole, examDuration, recruiterName, recruiterCompany, submittedTime, examRequestsUrl, platformName }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Exam Request</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#f4f6fb}
    .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:32px 24px;text-align:center;color:#fff}
    .header h1{margin:0 0 6px;font-size:20px;font-weight:700}
    .header p{margin:0;opacity:.85;font-size:14px}
    .body{padding:28px}
    .greeting{font-size:16px;color:#1e3a8a;font-weight:600;margin-bottom:10px}
    .text{font-size:14px;color:#374151;line-height:1.6;margin-bottom:18px}
    .exam-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:18px}
    .exam-title{font-size:18px;font-weight:800;color:#166534;margin-bottom:4px}
    .exam-role{font-size:13px;color:#16a34a}
    .info-box{background:#f8faff;border:1px solid #dbeafe;border-radius:10px;padding:18px 20px;margin-bottom:18px}
    .info-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #e0e7ff}
    .info-row:last-child{border-bottom:none}
    .info-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
    .info-value{font-size:14px;color:#1e3a8a;font-weight:700;word-break:break-all}
    .alert-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:22px}
    .alert-box p{margin:0;font-size:13px;color:#92400e;line-height:1.6}
    .btn-wrap{text-align:center;margin-bottom:8px}
    .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px}
    .footer{padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;font-size:12px;color:#9ca3af;line-height:1.7}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>&#x1F4CB; New Exam Request</h1>
      <p>A recruiter has submitted an exam for review</p>
    </div>
    <div class="body">
      <div class="greeting">Hi ${adminName},</div>
      <p class="text">
        A recruiter has submitted a new exam creation request on <strong>${platformName}</strong>.
        Please review the details below and approve or reject it from the admin panel.
      </p>
      <div class="exam-box">
        <div class="exam-title">${examTitle}</div>
        <div class="exam-role">Role: ${examRole || '&#x2014;'}</div>
      </div>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Recruiter</span>
          <span class="info-value">${recruiterName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${recruiterCompany || '&#x2014;'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Duration</span>
          <span class="info-value">${examDuration ? `${examDuration} minutes` : '&#x2014;'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Submitted At</span>
          <span class="info-value">${submittedTime}</span>
        </div>
      </div>
      <div class="alert-box">
        <p>&#x23F3; <strong>Awaiting Review</strong><br>
        This exam will not be visible to students until you approve it. Please review
        the exam details and approve or reject from the admin panel.</p>
      </div>
      <div class="btn-wrap">
        <a href="${examRequestsUrl}" class="btn">Review Exam Request &#x2192;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated alert from ${platformName}. Please do not reply directly to this email.<br>
      &copy; ${new Date().getFullYear()} ${platformName}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

// ─── Core send function ───────────────────────────────────────────────────────
async function sendEmail({ to, templateKey, variables = {}, fallbackSubject, fallbackHtml }) {
  try {
    const [template, platformSettings] = await Promise.all([
      loadTemplate(templateKey),
      loadPlatformSettings(),
    ]);

    const platformName = platformSettings.platform_name || 'AI Assessment Platform';

    // Merge platform defaults so templates always have access to them
    const mergedVars = {
      platform_name:     platformName,
      login_url:         platformSettings.login_url          || '#',
      exam_url:          platformSettings.exam_url           || '#',
      approvals_url:     platformSettings.approvals_url      || '#',
      exam_requests_url: platformSettings.exam_requests_url  || '#',
      admin_name:        platformSettings.admin_name         || 'Admin',
      year:              new Date().getFullYear(),
      ...variables,
    };

    const subject  = interpolate(template?.subject  || fallbackSubject || 'Notification', mergedVars);
    const bodyHtml = interpolate(template?.body_html || fallbackHtml   || '<p>No content</p>', mergedVars);

    const fromAddress = process.env.SMTP_FROM
      || process.env.SMTP_USER
      || process.env.EMAIL_USER
      || 'noreply@platform.io';

    // FIX 3: encoding + Content-Type header — ensures emojis / special chars
    // survive SMTP transport and render correctly in all mail clients.
    await transporter.sendMail({
      from:     `"${platformName}" <${fromAddress}>`,
      to,
      subject,
      html:     bodyHtml,
      encoding: 'utf-8',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

    console.log(`[EmailService] Sent "${templateKey}" to ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`[EmailService] Failed to send "${templateKey}" to ${to}:`, err);
    return { success: false, error: err.message };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send student welcome email with temporary password.
 */
async function sendStudentWelcome({ to, studentName, studentEmail, tempPassword }) {
  const platformSettings = await loadPlatformSettings();
  const platformName     = platformSettings.platform_name || 'AI Assessment Platform';
  const loginUrl         = platformSettings.login_url     || '#';

  return sendEmail({
    to,
    templateKey:     'student_welcome',
    variables: {
      student_name:  studentName,
      student_email: studentEmail,
      temp_password: tempPassword,
    },
    fallbackSubject: `Welcome to ${platformName} \u2014 Your Login Details`,
    fallbackHtml:    buildStudentWelcomeHtml({ studentName, studentEmail, tempPassword, loginUrl, platformName }),
  });
}

/**
 * Send exam invitation with access key.
 */
async function sendExamInvitation({ to, studentName, examKey, examTitle, examDuration, examDate, examTime }) {
  const platformSettings = await loadPlatformSettings();
  const platformName     = platformSettings.platform_name || 'AI Assessment Platform';
  const examUrl          = platformSettings.exam_url      || '#';

  return sendEmail({
    to,
    templateKey:     'exam_invitation',
    variables: {
      student_name:  studentName,
      exam_key:      examKey,
      exam_title:    examTitle,
      exam_duration: examDuration || '',
      exam_date:     examDate     || '',
      exam_time:     examTime     || '',
    },
    fallbackSubject: `Your Exam Invitation \u2014 ${examTitle}`,
    fallbackHtml:    buildExamInvitationHtml({ studentName, examKey, examTitle, examDuration, examDate, examTime, examUrl, platformName }),
  });
}

/**
 * Notify admin when a new recruiter signs up and needs approval.
 *
 * Usage:
 *   await sendRecruiterSignupAlert({
 *     to: adminEmail,
 *     recruiterName: 'Samson',
 *     recruiterEmail: 'samson@virtusa.com',
 *     recruiterCompany: 'Virtusa',
 *     signupTime: new Date().toLocaleString(),
 *   });
 */
async function sendRecruiterSignupAlert({ to, recruiterName, recruiterEmail, recruiterCompany, signupTime }) {
  const platformSettings = await loadPlatformSettings();
  const platformName     = platformSettings.platform_name || 'AI Assessment Platform';
  const adminName        = platformSettings.admin_name    || 'Admin';
  const approvalsUrl     = platformSettings.approvals_url || '#';

  return sendEmail({
    to,
    templateKey:     'recruiter_signup',
    variables: {
      admin_name:        adminName,
      recruiter_name:    recruiterName,
      recruiter_email:   recruiterEmail,
      recruiter_company: recruiterCompany || '',
      signup_time:       signupTime || new Date().toLocaleString(),
    },
    fallbackSubject: 'New Recruiter Sign-Up \u2014 Approval Required',
    fallbackHtml:    buildRecruiterSignupHtml({ adminName, recruiterName, recruiterEmail, recruiterCompany, signupTime, approvalsUrl, platformName }),
  });
}

/**
 * Notify admin when a recruiter submits a new exam request.
 *
 * Usage:
 *   await sendExamRequestAlert({
 *     to: adminEmail,
 *     examTitle: 'Backend Developer',
 *     examRole: 'Software Engineer',
 *     examDuration: 60,
 *     recruiterName: 'John',
 *     recruiterCompany: 'Acme Corp',
 *     submittedTime: new Date().toLocaleString(),
 *   });
 */
async function sendExamRequestAlert({ to, examTitle, examRole, examDuration, recruiterName, recruiterCompany, submittedTime }) {
  const platformSettings = await loadPlatformSettings();
  const platformName     = platformSettings.platform_name     || 'AI Assessment Platform';
  const adminName        = platformSettings.admin_name        || 'Admin';
  const examRequestsUrl  = platformSettings.exam_requests_url || '#';

  return sendEmail({
    to,
    templateKey:     'exam_request',
    variables: {
      admin_name:        adminName,
      exam_title:        examTitle,
      exam_role:         examRole         || '',
      exam_duration:     examDuration     || '',
      recruiter_name:    recruiterName,
      recruiter_company: recruiterCompany || '',
      submitted_time:    submittedTime    || new Date().toLocaleString(),
    },
    fallbackSubject: `New Exam Request \u2014 ${examTitle}`,
    fallbackHtml:    buildExamRequestHtml({ adminName, examTitle, examRole, examDuration, recruiterName, recruiterCompany, submittedTime, examRequestsUrl, platformName }),
  });
}

module.exports = {
  sendStudentWelcome,
  sendExamInvitation,
  sendRecruiterSignupAlert,
  sendExamRequestAlert,
  sendEmail,   // exposed for custom / future templates
};