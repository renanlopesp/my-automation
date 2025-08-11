import { Resend } from 'resend'

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send CAPTCHA alert email to admin
 * @param {Object} options - Alert options
 * @param {string} options.adminEmail - Admin email address
 * @param {string} options.templateName - Current template being processed
 * @param {string} options.webflowUrl - Current Webflow URL where CAPTCHA appeared
 * @param {string} options.screenshotPath - Path to screenshot (optional)
 * @param {string} options.serverUrl - EC2 server URL for remote access
 */
export async function sendCaptchaAlert({
  adminEmail = 'admin@tem.place',
  templateName = 'Unknown Template',
  webflowUrl = '',
  screenshotPath = '',
  serverUrl = '',
}) {
  try {
    const currentTime = new Date().toLocaleString()

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          🚨 CAPTCHA Detected - Manual Intervention Required
        </h2>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #991b1b; margin-top: 0;">Alert Details</h3>
          <ul style="color: #7f1d1d;">
            <li><strong>Time:</strong> ${currentTime}</li>
            <li><strong>Template:</strong> ${templateName}</li>
            <li><strong>Webflow URL:</strong> <a href="${webflowUrl}" target="_blank">${webflowUrl}</a></li>
            ${screenshotPath ? `<li><strong>Screenshot:</strong> ${screenshotPath}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin-top: 0;">🖥️ Remote Access Instructions</h3>
          <p style="color: #1e40af;">
            The automation has been <strong>paused automatically</strong>. To resolve the CAPTCHA:
          </p>
          <ol style="color: #1e40af;">
            <li>Access the EC2 server using Remmina</li>
            <li>Server URL: <code style="background-color: #dbeafe; padding: 2px 4px; border-radius: 4px;">${serverUrl}</code></li>
            <li>Navigate to the Chrome browser window</li>
            <li>Manually solve the CAPTCHA</li>
            <li>The automation will continue automatically</li>
          </ol>
        </div>

        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #0c4a6e; margin: 0;">
            <strong>Note:</strong> This email was sent automatically by the DSM Automation System.
            The automation will remain paused until the CAPTCHA is resolved.
          </p>
        </div>
      </div>
    `

    const textContent = `
🚨 CAPTCHA DETECTED - Manual Intervention Required

Alert Details:
- Time: ${currentTime}
- Template: ${templateName}
- Webflow URL: ${webflowUrl}
${screenshotPath ? `- Screenshot: ${screenshotPath}` : ''}

Remote Access Instructions:
The automation has been paused automatically. To resolve the CAPTCHA:

1. Access the EC2 server using Remmina
2. Server URL: ${serverUrl}
3. Navigate to the Chrome browser window
4. Manually solve the CAPTCHA
5. The automation will continue automatically

Note: This email was sent automatically by the DSM Automation System.
The automation will remain paused until the CAPTCHA is resolved.
    `

    const response = await resend.emails.send({
      from: 'automation@tem.place',
      to: adminEmail,
      subject: `🚨 CAPTCHA Alert: ${templateName} - Manual Action Required`,
      text: textContent,
      html: htmlContent,
    })

    if (response.data) {
      console.log('✅ CAPTCHA alert email sent successfully:', response.data.id)
      return { success: true, messageId: response.data.id }
    } else {
      console.error('❌ Failed to send CAPTCHA alert email:', response.error)
      return { success: false, error: response.error }
    }
  } catch (error) {
    console.error('❌ Error sending CAPTCHA alert email:', error)
    return { success: false, error: error.message }
  }
}
