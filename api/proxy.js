const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) {
        return res.status(400).json({ error: "Missing videoUrl" });
    }

    try {
        // 1. Download video from Instagram into memory
        const videoResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 8000, // Stay within Vercel's execution limit
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // 2. Prepare Catbox Upload
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', videoResponse.data, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4',
        });

        // 3. Push to Catbox
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
        });

        return res.status(200).send(catboxResponse.data);
    } catch (error) {
        return res.status(500).json({ 
            error: "Proxy Failed", 
            message: error.message,
            details: error.response ? error.response.data.toString() : null
        });
    }
}
  
