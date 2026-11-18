require("dotenv").config();
const express = require("express");
const { v4: uuid } = require("uuid");
const {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();
const s3 = new S3Client({ region: process.env.AWS_REGION });

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

// 1) Get a signed URL to upload a file
router.post("/upload-url", async (req, res) => {
  try {
    const { fileName, fileType, folder = "uploads" } = req.body;
    if (fileType && !ALLOWED.includes(fileType)) {
      return res.status(400).json({ error: "File type not allowed" });
    }
    const cleanFileName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, "_") : "file";
    const key = `${folder}/${uuid()}-${cleanFileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    res.json({ uploadUrl, key, fileUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Get a signed URL to view/download a file (JSON)
router.get("/file-url", async (req, res) => {
  try {
    const rawKey = req.query.key || req.query.url;
    if (!rawKey) return res.status(400).json({ error: "Key or url is required" });
    const key = rawKey.includes(".amazonaws.com/") ? rawKey.split(".amazonaws.com/")[1] : rawKey;
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2b) Direct view/download endpoint (redirects to pre-signed S3 URL for images/PDFs in browser)
router.get("/view", async (req, res) => {
  try {
    const rawKey = req.query.key || req.query.url;
    if (!rawKey) return res.status(400).send("Key or url is required");
    const key = rawKey.includes(".amazonaws.com/") ? rawKey.split(".amazonaws.com/")[1] : rawKey;
    const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.redirect(signedUrl);
  } catch (e) {
    res.status(500).send(`Error viewing file: ${e.message}`);
  }
});

// 3) Delete a file
router.delete("/file", async (req, res) => {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: req.body.key }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;