import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Download video into a Buffer
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            },
            timeout: 10000 
        });

        const buffer = Buffer.from(response.data);

        // 2. Prepare the Form
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Post to Catbox with cleaner headers
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                // Using a real browser User-Agent to avoid 412/security blocks
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Explicitly disable the "Expect" header which can cause 412 errors
                'Expect': ''
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 25000 
        });

        const result = catboxResponse.data.toString().trim();
        return res.status(200).send(result);

    } catch (error) {
        console.error("Proxy Error:", error.message);
        const errorDetail = error.response ? error.response.data.toString() : error.message;
        return res.status(error.response ? error.response.status : 500).send(`Proxy Error: ${errorDetail}`);
    }
}
