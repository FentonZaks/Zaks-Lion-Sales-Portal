import { Resend } from 'resend';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerName, pdfBase64, csvBase64, recipientEmail } = req.body;
    
    if (!customerName || !pdfBase64 || !csvBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Resend with the environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Zaks Sales Portal <portal@zaksfoods.ca>',
      to: recipientEmail || 'bryan@zaksfoods.ca',
      subject: `New Customer Submitted: ${customerName}`,
      html: `<p>A new customer (<strong>${customerName}</strong>) has been submitted via the Sales Portal.</p>
             <p>Please find the attached PDF summary and CSV export.</p>`,
      attachments: [
        {
          filename: `${customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.pdf`,
          content: pdfBase64.split(',')[1] || pdfBase64, // Remove data URI prefix if present
        },
        {
          filename: `${customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`,
          content: csvBase64.split(',')[1] || csvBase64,
        }
      ]
    });

    if (error) {
      console.error("Resend API Error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: 'Email sent successfully', data });
  } catch (error: any) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
