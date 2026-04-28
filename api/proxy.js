import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Fetch video
        const response = await fetch(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) throw new Error(`IG Download Failed: ${response.status}`);

        // Convert to Buffer to ensure multipart/form-data compatibility
        const buffer = await response.buffer();

        // 2. Prepare Payload
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4',
        });

        // 3. Request to Catbox
        const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        const result = await catboxResponse.text();
        
        // If Catbox returns an error, send back the debug info
        if (result.includes("Invalid") || !result.includes("https")) {
            return res.status(422).json({
                error: "Catbox Rejected Payload",
                raw_response: result,
                sent_payload: {
                    reqtype: 'fileupload',
                    fileName: fileName,
                    fileSize: buffer.length
                }
            });
        }

        return res.status(200).send(result.trim());

    } catch (error) {
        return res.status(500).json({ error: "Proxy Crash", message: error.message });
    }
}
