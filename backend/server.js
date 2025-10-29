const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const { extractHandwriting } = require("./googleOCR");
const { rebuildText } = require("./llmRebuild");

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/process-pdf", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfJson = await pdfParse(pdfBuffer);

    let ocrText = await extractHandwriting(filePath);
    let cleanText = await rebuildText(ocrText);

    res.json({ text: cleanText });

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Processing failed" });
  }
});

app.listen(4000, () => console.log("Backend running on port 4000"));
