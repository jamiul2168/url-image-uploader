import fetch from "node-fetch";
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "urls array required" });
  }

  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/drive"]
    );

    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.DRIVE_FOLDER_ID;

    const results = [];

    for (const url of urls) {
      try {
        // only image check
        if (!url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
          throw new Error("Not an image URL");
        }

        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error("Failed to fetch image");

        const buffer = await imgRes.buffer();
        const ext = url.split(".").pop().split("?")[0];
        const fileName = `img_${Date.now()}.${ext}`;

        const file = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [folderId]
          },
          media: {
            mimeType: imgRes.headers.get("content-type"),
            body: buffer
          }
        });

        const fileId = file.data.id;
        const driveLink = `https://drive.google.com/file/d/${fileId}/view`;

        results.push({
          original: url,
          success: true,
          driveLink
        });

      } catch (err) {
        results.push({
          original: url,
          success: false,
          error: err.message
        });
      }
    }

    res.status(200).json({ results });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
