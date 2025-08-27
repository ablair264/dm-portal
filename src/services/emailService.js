// server/src/services/emailService.js
import postmark from 'postmark';

// Initialize Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const result = await client.sendEmail({
      From: process.env.EMAIL_FROM || 'sales@dmbrands.co.uk',
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      MessageStream: 'outbound'
    });
    
    console.log(`Email sent successfully to ${to}, MessageID: ${result.MessageID}`);
    return { 
      success: true, 
      messageId: result.MessageID 
    };
    
  } catch (error) {
    console.error('Postmark error:', error);
    
    if (error.ErrorCode) {
      console.error(`Postmark Error Code: ${error.ErrorCode}`);
      console.error(`Postmark Message: ${error.Message}`);
    }
    
    throw error;
  }
};

// Optional: Send with template
export const sendEmailWithTemplate = async ({ to, templateAlias, templateModel }) => {
  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.EMAIL_FROM || 'sales@dmbrands.co.uk',
      To: to,
      TemplateAlias: templateAlias,
      TemplateModel: templateModel,
      MessageStream: 'outbound'
    });
    
    console.log(`Template email sent to ${to}, MessageID: ${result.MessageID}`);
    return { 
      success: true, 
      messageId: result.MessageID 
    };
    
  } catch (error) {
    console.error('Postmark template error:', error);
    throw error;
  }
};

// Send signup inquiry to sales team
export const sendSignupInquiry = async (inquiryData) => {
  const {
    companyName,
    companyRegNo,
    address,
    email,
    phone,
    brandsInterested,
    submittedAt
  } = inquiryData;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4a90e2, #357abd); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Account Request</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">DM Brands Customer Portal</p>
      </div>
      
      <div style="padding: 30px; background: white;">
        <h2 style="color: #333; margin-bottom: 20px;">Company Information</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555; width: 140px;">Company Name:</td>
            <td style="padding: 8px 0; color: #333;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Registration No:</td>
            <td style="padding: 8px 0; color: #333;">${companyRegNo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
            <td style="padding: 8px 0; color: #333;"><a href="mailto:${email}" style="color: #4a90e2;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td>
            <td style="padding: 8px 0; color: #333;"><a href="tel:${phone}" style="color: #4a90e2;">${phone}</a></td>
          </tr>
        </table>
        
        <h3 style="color: #333; margin-bottom: 15px;">Address</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0; line-height: 1.6; color: #333;">
            ${address.line1}<br>
            ${address.line2 ? address.line2 + '<br>' : ''}
            ${address.town}<br>
            ${address.postcode}
          </p>
        </div>
        
        ${brandsInterested && brandsInterested.length > 0 ? `
          <h3 style="color: #333; margin-bottom: 15px;">Brands of Interest</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <ul style="margin: 0; padding-left: 20px; color: #333;">
              ${brandsInterested.map(brand => `<li style="margin-bottom: 5px;">${brand}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-weight: 500;">
            📅 Submitted: ${new Date(submittedAt).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">DM Brands Customer Portal - Account Request System</p>
      </div>
    </div>
  `;

  const text = `
New Account Request - DM Brands Customer Portal

Company Information:
Company Name: ${companyName}
Registration No: ${companyRegNo}
Email: ${email}
Phone: ${phone}

Address:
${address.line1}
${address.line2 ? address.line2 + '\n' : ''}${address.town}
${address.postcode}

${brandsInterested && brandsInterested.length > 0 ? `
Brands of Interest:
${brandsInterested.map(brand => `- ${brand}`).join('\n')}
` : ''}

Submitted: ${new Date(submittedAt).toLocaleString('en-GB')}
  `;

  return await sendEmail({
    to: 'sales@dmbrands.co.uk',
    subject: `New Account Request: ${companyName}`,
    html,
    text
  });
};

// Optional: Batch sending
export const sendBulkEmails = async (emails) => {
  try {
    const messages = emails.map(({ to, subject, html, text }) => ({
      From: process.env.EMAIL_FROM || 'sales@dmbrands.co.uk',
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text || html.replace(/<[^>]*>/g, ''),
      MessageStream: 'outbound'
    }));
    
    const results = await client.sendEmailBatch(messages);
    
    console.log(`Bulk emails sent: ${results.length} emails`);
    return { 
      success: true, 
      count: results.length,
      results 
    };
    
  } catch (error) {
    console.error('Postmark bulk error:', error);
    throw error;
  }
};