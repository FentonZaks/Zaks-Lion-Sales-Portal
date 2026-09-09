import { jsPDF } from 'jspdf';
import fs from 'fs';

const formData = {"idx":2,"id":"3f64babb-820d-45e2-a7ae-d190550fb7dd","name":"Strathmore convenience ","legal_name":"2788458","shipping_address":"209 203 third ave ","shipping_city":"Strathmore ","shipping_postal_code":"T1P 1N7 ","shipping_country":"Canada","banner":"","channel":"","price_level":"","sales_rep":"","primary_first_name":"Deep ","primary_last_name":"Patel ","primary_email":"strathmoreconveniencestore@gmail.com","primary_phone":"4379821227","ap_name":"Deep Patel ","ap_email":"strathmoreconveniencestore@gmail.com","ap_phone":"4379821227","status":"PENDING","created_at":"2026-09-04 16:53:51.805988+00","updated_at":"2026-09-04 16:53:51.805988+00","submitted_by":"6a8c9dc3-9d9a-42f8-9ef5-82fc94b2bec6"};

async function recover() {
    console.log("Generating CSV...");
    const submittedByStr = "Jarvis";

    const headers = ["Field", "Value"];
    const rows = [
        ["Submitted By", submittedByStr],
        ["Customer Name", formData.name],
        ["Legal Name", formData.legal_name],
        ["Shipping Address", formData.shipping_address],
        ["City", formData.shipping_city],
        ["Postal Code", formData.shipping_postal_code],
        ["Country", formData.shipping_country],
        ["Banner", formData.banner],
        ["Channel", formData.channel],
        ["Price Level", formData.price_level],
        ["Sales Rep", formData.sales_rep],
        ["Primary Contact First", formData.primary_first_name],
        ["Primary Contact Last", formData.primary_last_name],
        ["Primary Email", formData.primary_email],
        ["Primary Phone", formData.primary_phone],
        ["AP Name", formData.ap_name],
        ["AP Email", formData.ap_email],
        ["AP Phone", formData.ap_phone]
    ];
    
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const csvBase64 = Buffer.from(csvContent).toString('base64');

    console.log("Generating PDF...");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("New Customer Submission", 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    const addLine = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text((value || "N/A").toString(), 70, y);
        y += 8;
    };

    addLine("Submitted By", submittedByStr);
    addLine("Customer Name", formData.name);
    addLine("Legal Name", formData.legal_name);
    addLine("Banner", formData.banner);
    addLine("Channel", formData.channel);
    addLine("Price Level", formData.price_level);
    addLine("Sales Rep", formData.sales_rep);
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Shipping Info", 20, y);
    y += 8;
    addLine("Address", formData.shipping_address);
    addLine("City", formData.shipping_city);
    addLine("Postal Code", formData.shipping_postal_code);
    addLine("Country", formData.shipping_country);
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Primary Contact", 20, y);
    y += 8;
    addLine("Name", `${formData.primary_first_name || ''} ${formData.primary_last_name || ''}`);
    addLine("Email", formData.primary_email);
    addLine("Phone", formData.primary_phone);
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Accounts Payable", 20, y);
    y += 8;
    addLine("Name", formData.ap_name);
    addLine("Email", formData.ap_email);
    addLine("Phone", formData.ap_phone);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const pdfBase64 = pdfBuffer.toString('base64');

    console.log("Sending email via live API...");
    const emailRes = await fetch('https://zaks-lion-sales-portal.vercel.app/api/send-new-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerName: formData.name,
            pdfBase64: `data:application/pdf;base64,${pdfBase64}`,
            csvBase64: `data:text/csv;base64,${csvBase64}`,
            recipientEmail: 'bryan@zaksfoods.ca'
        })
    });

    const emailResult = await emailRes.json();
    if (!emailRes.ok) {
        console.error("Failed to send email:", emailResult);
    } else {
        console.log("Success! Email sent via API.");
    }
}

recover();
