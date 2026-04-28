import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) {
        return res.status(400).send("Error: Missing videoUrl parameter.");
    }

    try {
        // 1. Fetch the video stream from Instagram
        const response = await fetch(videoUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) throw new Error(`Instagram Download Failed: ${response.statusText}`);

        // 2. Prepare the multipart form for Catbox
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', response.body, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4',
        });

        // 3. Pipe the stream directly to Catbox
        const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        const result = await catboxResponse.text();
        return res.status(200).send(result.trim());

    } catch (error) {
        console.error("Proxy Error:", error.message);
        return res.status(500).send(`Proxy Error: ${error.message}`);
    }
}
