const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function extractHandwriting(imagePath) {
  const [result] = await client.documentTextDetection(imagePath);
  let text = result.fullTextAnnotation?.text || "";

  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\s+/g, ' ');
  return text;
}

module.exports = { extractHandwriting };
