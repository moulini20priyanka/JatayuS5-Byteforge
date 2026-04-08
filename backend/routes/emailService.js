// backend/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({  // ✅ CORRECT
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


async function sendExamInviteEmail(to, studentName, examTitle, examKey, duration) {
  const mailOptions = {
    from: `"Exam Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Exam Invitation: ${examTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            background-color: #f8f9fa; 
            line-height: 1.6; 
            color: #2d3748;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
          }
          .header p { 
            color: rgba(255,255,255,0.9); 
            margin-top: 8px; 
            font-size: 16px; 
          }
          .content { 
            padding: 40px 30px; 
          }
          .greeting { 
            font-size: 20px; 
            font-weight: 600; 
            color: #1e293b; 
            margin-bottom: 8px; 
          }
          .message { 
            font-size: 16px; 
            color: #475569; 
            margin-bottom: 32px; 
          }
          .key-section { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
            border: 2px solid #e2e8f0; 
            border-radius: 16px; 
            padding: 32px; 
            text-align: center; 
            margin: 32px 0; 
          }
          .key-label { 
            font-size: 14px; 
            color: #64748b; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            margin-bottom: 16px; 
            font-weight: 500; 
          }
          .exam-key { 
            font-size: 36px; 
            font-weight: 700; 
            color: #1e293b; 
            letter-spacing: 6px; 
            font-family: 'Courier New', monospace; 
            text-transform: uppercase; 
          }
          .exam-details { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 24px; 
            margin: 24px 0; 
          }
          .detail-row { 
            display: flex; 
            align-items: center; 
            margin-bottom: 16px; 
            font-size: 15px; 
          }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-icon { 
            width: 20px; 
            height: 20px; 
            margin-right: 12px; 
            color: #3b82f6; 
          }
          .detail-label { 
            font-weight: 600; 
            color: #1e293b; 
            min-width: 80px; 
          }
          .detail-value { color: #475569; }
          .instructions { 
            background: #fffbeb; 
            border: 1px solid #fde68a; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 24px 0; 
          }
          .instructions h3 { 
            color: #92400e; 
            font-size: 15px; 
            margin-bottom: 12px; 
            font-weight: 600; 
          }
          .instructions ul { 
            color: #a16207; 
            font-size: 14px; 
            padding-left: 20px; 
            margin: 0; 
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
            color: #ffffff; 
            padding: 16px 32px; 
            border-radius: 8px; 
            text-decoration: none; 
            font-size: 16px; 
            font-weight: 600; 
            margin: 24px 0; 
            box-shadow: 0 4px 12px rgba(59,130,246,0.4);
          }
          .footer { 
            background: #f8fafc; 
            padding: 24px; 
            text-align: center; 
            font-size: 14px; 
            color: #94a3b8; 
            border-top: 1px solid #e2e8f0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Exam Portal</h1>
            <p>Your official exam invitation</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${studentName},</div>
            <p class="message">You have been scheduled to take an important exam. Please use the unique access key below to begin your test.</p>
            
            <div class="key-section">
              <div class="key-label">Access Key</div>
              <div class="exam-key">${examKey}</div>
            </div>

            <div class="exam-details">
              <div class="detail-row">
                <span class="detail-icon">📋</span>
                <span class="detail-label">Exam Title:</span>
                <span class="detail-value">${examTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-icon">⏱️</span>
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${duration} minutes</span>
              </div>
            </div>

            <div class="instructions">
              <h3>📌 Important Instructions</h3>
              <ul>
                <li>Keep your access key secure and confidential</li>
                <li>Enter this key on the exam portal to start your test</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Contact your administrator if you encounter any issues</li>
              </ul>
            </div>

            <a href="#" class="cta-button">Start Exam Portal</a>
            
            <p style="font-size: 15px; color: #64748b; text-align: center; margin-top: 24px;">
              We wish you the very best with your exam. You've got this! ✨
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Exam Portal. Please do not reply directly to this email.</p>
            <p>&copy; 2024 Exam Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendExamInviteEmail };