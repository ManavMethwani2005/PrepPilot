const pdfParse = require('pdf-parse');

/**
 * Extracts plain text from an in-memory PDF Buffer.
 * Never writes to disk. Handles malformed or scanned PDFs gracefully.
 *
 * @param {Buffer} buffer - In-memory file buffer from multer
 * @returns {Promise<{ text: string, numPages: number }>}
 */
const extractTextFromPdfBuffer = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid PDF file buffer provided.');
  }

  // Basic PDF magic number header validation (%PDF-)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new Error('The uploaded file is not a valid PDF document.');
  }

  let data;
  try {
    data = await pdfParse(buffer);
  } catch (parseErr) {
    throw new Error(`Failed to parse PDF document: ${parseErr.message || 'Corrupted file structure'}`);
  }

  const rawText = data?.text || '';
  const cleanedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^[•\-\*]\s*\n+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleanedText.length < 20) {
    throw new Error(
      'The uploaded PDF appears to be empty or contains scanned images without selectable text. Please upload a PDF with readable text or add topics manually.'
    );
  }

  return {
    text: cleanedText,
    numPages: data.numpages || 1,
  };
};

module.exports = { extractTextFromPdfBuffer };
