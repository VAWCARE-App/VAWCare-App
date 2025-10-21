const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const BPO = require('../models/BPO');

async function fillBPOForm(bpoId) {
    // 1. Find the document in MongoDB
    const bpo = await BPO.findOne({ bpoID: bpoId });
    if (!bpo) throw new Error('BPO not found');

    // 2. Load your fillable PDF template
    const templatePath = path.join(__dirname, 'BPO_template.pdf');

    const pdfBytes = fs.readFileSync(templatePath);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // 3. Fill fields using your schema names
    form.getTextField('controlNO').setText(bpo.controlNO || '');
    form.getTextField('nameofRespondent').setText(bpo.nameofRespondent || '');
    form.getTextField('address').setText(bpo.address || '');
    form.getTextField('applicationName').setText(bpo.applicationName || '');
    form.getTextField('orderDate').setText(bpo.orderDate?.toLocaleDateString() || '');
    form.getTextField('statement').setText(bpo.statement || '');
    form.getTextField('hisOrher').setText(bpo.hisOrher || '');
    form.getTextField('nameofChildren').setText(bpo.nameofChildren || '');
    form.getTextField('dateIssued').setText(bpo.dateIssued?.toLocaleDateString() || '');
    form.getTextField('copyReceivedBy').setText(bpo.copyReceivedBy || '');
    form.getTextField('dateReceived').setText(bpo.dateReceived?.toLocaleDateString() || '');
    form.getTextField('servedBy').setText(bpo.servedBy || '');
    form.getTextField('punongBarangay').setText(bpo.punongBarangay || '');
    form.getTextField('barangayKagawad').setText(bpo.barangaykagawad || '');
    form.getTextField('time').setText(bpo.time || '');
    form.getTextField('unavailabledate').setText(bpo.unavailabledate?.toLocaleDateString() || '');

    // Save PDF in memory and return bytes
    const filledPdfBytes = await pdfDoc.save();
    console.log(`✅ Filled BPO PDF for BPO ID ${bpoId}`);
    return filledPdfBytes;
}

module.exports = fillBPOForm;