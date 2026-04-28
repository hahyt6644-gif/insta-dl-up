import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Download the video into a Buffer
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000 // 10s limit to fetch from source
        });

        const buffer = Buffer.from(response.data);

        // 2. Prepare the Form according to Catbox Docs
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Post to Catbox API
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Vercel-Proxy-Uploader'
            },
            timeout: 20000 // Give Catbox time to process
        });

        const result = catboxResponse.data.toString().trim();
        return res.status(200).send(result);

    } catch (error) {
        console.error("Proxy Error:", error.message);
        return res.status(500).send(`Proxy Error: ${error.message}`);
    }
}
