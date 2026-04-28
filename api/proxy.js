import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Download video from the source
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            },
            timeout: 10000 
        });

        const buffer = Buffer.from(response.data);

        // 2. Construct the Form with strict ordering
        const form = new FormData();
        // reqtype MUST be "fileupload"
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Post using getBuffer() to guarantee the multipart boundary
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form.getBuffer(), {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Connection': 'keep-alive'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000 
        });

        const result = catboxResponse.data.toString().trim();
        
        if (result.includes("https://files.catbox.moe/")) {
            return res.status(200).send(result);
        } else {
            return res.status(422).json({
                error: "Catbox Rejected Request",
                raw: result,
                debug: {
                    sent_reqtype: "fileupload",
                    received_size: buffer.length
                }
            });
        }

    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const msg = error.response ? error.response.data.toString() : error.message;
        return res.status(status).send(`Proxy Error: ${msg}`);
    }
}
