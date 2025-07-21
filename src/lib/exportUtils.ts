import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Media } from 'docx';

export const exportAsZip = async (captures) => {
  const zip = new JSZip();
  captures.forEach((cap, i) => {
    zip.file(`image${i + 1}.jpg`, cap.dataUrl.split(',')[1], { base64: true });
    zip.file(`description${i + 1}.txt`, cap.description || '');
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'captures.zip');
};

export const exportAsCSV = (captures) => {
  const csv = ['Image,Description'];
  captures.forEach((cap, i) => {
    csv.push(`image${i + 1}.jpg,"${(cap.description || '').replace(/"/g, '""')}"`);
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  saveAs(blob, 'captures.csv');
};

export const exportAsDocx = async (captures) => {
  const doc = new Document();
  for (const cap of captures) {
    if (cap.dataUrl) {
      const image = Media.addImage(doc, Buffer.from(cap.dataUrl.split(',')[1], 'base64'));
      doc.addSection({ children: [image] });
    }
    if (cap.description) {
      doc.addSection({ children: [new Paragraph(cap.description)] });
    }
  }
  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'captures.docx');
};