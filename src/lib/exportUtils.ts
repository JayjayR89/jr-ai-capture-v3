import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Media, HeadingLevel } from 'docx';

export const exportAsZip = async (captures, filename = 'captures') => {
  const zip = new JSZip();
  const meta = captures.map((cap, i) =>
    `Image: image${i + 1}.jpg\nDescription: ${(cap.description || '').replace(/\n/g, ' ')}\nTimestamp: ${cap.timestamp}\nTags: ${(cap.tags || []).join(', ')}\nNotes: ${cap.notes || ''}\n---\n`
  ).join('\n');
  zip.file('metadata.txt', meta);
  captures.forEach((cap, i) => {
    zip.file(`image${i + 1}.jpg`, cap.dataUrl.split(',')[1], { base64: true });
    zip.file(`description${i + 1}.txt`, cap.description || '');
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${filename}.zip`);
};

export const exportAsCSV = (captures, filename = 'captures', delimiter = ',') => {
  const csv = [
    ['Image', 'Description', 'Timestamp', 'Tags', 'Notes'].join(delimiter)
  ];
  captures.forEach((cap, i) => {
    csv.push([
      `image${i + 1}.jpg`,
      (cap.description || '').replace(/"/g, '""'),
      cap.timestamp,
      (cap.tags || []).join('|'),
      cap.notes || ''
    ].map(v => `"${v}"`).join(delimiter));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  saveAs(blob, `${filename}.csv`);
};

export const exportAsDocx = async (captures, filename = 'captures', style = 'default') => {
  const doc = new Document();
  for (const [i, cap] of captures.entries()) {
    const children = [];
    if (cap.dataUrl) {
      const image = Media.addImage(doc, Buffer.from(cap.dataUrl.split(',')[1], 'base64'));
      children.push(image);
    }
    if (cap.description) {
      children.push(new Paragraph({ text: cap.description, heading: style === 'compact' ? undefined : HeadingLevel.HEADING_2 }));
    }
    children.push(new Paragraph({ text: `Timestamp: ${cap.timestamp}` }));
    children.push(new Paragraph({ text: `Tags: ${(cap.tags || []).join(', ')}` }));
    children.push(new Paragraph({ text: `Notes: ${cap.notes || ''}` }));
    doc.addSection({ children });
  }
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};