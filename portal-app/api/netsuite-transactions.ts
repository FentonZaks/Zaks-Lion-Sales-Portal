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
    const secret = process.env.NETSUITE_PORTAL_API_SECRET;

    if (!suiteletUrl || !secret) {
      console.error("Missing NetSuite environment variables.");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let url = `${suiteletUrl}&action=${encodeURIComponent(action)}&token=${encodeURIComponent(secret)}`;
    
    if (action === 'get_transactions') {
        if (!customerId) return res.status(400).json({ error: 'Missing customerId' });
        url += `&customer_id=${encodeURIComponent(customerId)}`;
    } else if (action === 'get_pdf') {
        if (!transactionId) return res.status(400).json({ error: 'Missing transactionId' });
        url += `&transaction_id=${encodeURIComponent(transactionId)}`;
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    const nsResponse = await fetch(url, {
        method: 'GET'
    });

    if (!nsResponse.ok) {
        let errorBody = 'No body';
        try { errorBody = await nsResponse.text(); } catch(e) {}
        throw new Error(`NetSuite returned status ${nsResponse.status}. Body: ${errorBody}`);
    }

    if (action === 'get_pdf') {
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
