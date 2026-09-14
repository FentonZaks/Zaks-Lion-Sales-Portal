import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export const config = {
  api: {
    responseLimit: false,
  },
};

function hash_function_sha256(base_string: string, key: string) {
    return crypto.createHmac('sha256', key).update(base_string).digest('base64');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, customerId, transactionId } = req.query;

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }

    const suiteletUrl = process.env.NETSUITE_TRANSACTIONS_URL;
    
    // We are switching to OAuth 1.0a (TBA)
    const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
    const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
    const tokenId = process.env.NETSUITE_TOKEN_ID;
    const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;
    const accountId = process.env.NETSUITE_ACCOUNT_ID;

    if (!suiteletUrl || !consumerKey || !tokenId || !accountId) {
      console.error("Missing NetSuite TBA environment variables.");
      return res.status(500).json({ error: 'Server configuration error: Missing TBA keys.' });
    }

    // Construct the clean internal NetSuite URL for TBA (app.netsuite.com)
    // We cannot use extforms.netsuite.com for authenticated TBA requests.
    const urlObj = new URL(suiteletUrl);
    const scriptId = urlObj.searchParams.get('script');
    const deployId = urlObj.searchParams.get('deploy');
    
    let cleanUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=${scriptId}&deploy=${deployId}&action=${encodeURIComponent(action)}`;
    
    if (action === 'get_transactions') {
        if (!customerId) return res.status(400).json({ error: 'Missing customerId' });
        cleanUrl += `&customer_id=${encodeURIComponent(customerId)}`;
    } else if (action === 'get_pdf') {
        if (!transactionId) return res.status(400).json({ error: 'Missing transactionId' });
        cleanUrl += `&transaction_id=${encodeURIComponent(transactionId)}`;
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    const oauth = new OAuth({
        consumer: { key: consumerKey, secret: consumerSecret! },
        signature_method: 'HMAC-SHA256',
        hash_function: hash_function_sha256,
        realm: accountId
    });

    const token = {
        key: tokenId,
        secret: tokenSecret!
    };

    const request_data = {
        url: cleanUrl,
        method: 'GET'
    };

    const headers = oauth.toHeader(oauth.authorize(request_data, token)) as any;
    headers['Content-Type'] = 'application/json';

    const nsResponse = await fetch(cleanUrl, {
        method: 'GET',
        headers: headers
    });

    if (!nsResponse.ok) {
        let errorBody = 'No body';
        try { errorBody = await nsResponse.text(); } catch(e) {}
        throw new Error(`NetSuite returned status ${nsResponse.status}. Body: ${errorBody}`);
    }

    if (action === 'get_pdf') {
        const contentType = nsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await nsResponse.json();
            return res.status(500).json(errorData);
        }

        // Stream the PDF back to the client
        const arrayBuffer = await nsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="transaction_${transactionId}.pdf"`);
        return res.send(buffer);
    } else {
        // Return JSON
        const data = await nsResponse.json();
        return res.status(200).json(data);
    }

  } catch (error: any) {
    console.error('NetSuite Transaction Fetch Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from NetSuite', details: error.message });
  }
}
