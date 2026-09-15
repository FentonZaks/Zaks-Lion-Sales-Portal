import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { customerName, pdfBase64, csvBase64, recipientEmail, authorizerName, dsdComment, signatureBase64 } = req.body;

        if (!pdfBase64 || !csvBase64) {
            return res.status(400).json({ error: 'Missing PDF or CSV data' });
        }

        // We could theoretically use signatureBase64 here as an attachment,
        // but the user said "i'd like for the image of the signature to be captured on the pdf that we generate."
        // We already embedded it in the PDF inside OrderBuilder.tsx!
        // We'll still send it as a separate attachment just in case they want the raw image.
        
        const attachments = [
            {
                filename: `DSD_Invoice_${customerName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'order'}.pdf`,
                content: pdfBase64.split('base64,')[1]
            },
            {
                filename: `DSD_Import_${customerName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'order'}.csv`,
                content: csvBase64.split('base64,')[1]
            }
        ];

        if (signatureBase64) {
            attachments.push({
                filename: `signature_${authorizerName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'auth'}.png`,
                content: signatureBase64.split('base64,')[1]
            });
        }

        let htmlContent = `
            <h2>New Direct Store Delivery (DSD) Invoice</h2>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Authorized By:</strong> ${authorizerName}</p>
        `;

        if (dsdComment) {
            htmlContent += `<p><strong>Driver Note:</strong> ${dsdComment}</p>`;
        }

        htmlContent += `
            <br/>
            <p>Attached are the PDF Receipt and the CSV for NetSuite import.</p>
            <p>To import into NetSuite:</p>
            <ol>
                <li>Download the attached CSV</li>
                <li>Go to the <strong>Zaks Portal Create Invoice from CSV</strong> Suitelet in NetSuite</li>
                <li>Upload the CSV and click Submit</li>
            </ol>
        `;

        const data = await resend.emails.send({
            from: 'Zaks Portal <portal@zaksfoods.ca>',
            to: recipientEmail || 'bryan@zaksfoods.ca', // Using bryan's email for testing as requested
            subject: `[DSD INVOICE] ${customerName}`,
            html: htmlContent,
            attachments: attachments
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error sending DSD email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
}
