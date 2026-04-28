import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Fetch Video from Source
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(response.data);

        // 2. Build Form (Strict Order for Catbox PHP Backend)
        const form = new FormData();
        form.append('reqtype', 'fileupload'); // Required by Catbox API
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        const headers = form.getHeaders();

        // 3. Post and Capture Exact Response
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form.getBuffer(), {
            headers: {
                ...headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000 
        });

        const result = catboxResponse.data.toString().trim();

        // If it's not a URL, it's an error. Return the exact data.
        if (!result.includes("https://files.catbox.moe/")) {
            return res.status(422).json({
                status: "API_REJECTION",
                catbox_response: result, // This will show "Invalid uploader" or other errors
                debug_info: {
                    sent_reqtype: "fileupload",
                    file_size_bytes: buffer.length,
                    content_type_header: headers['content-type']
                }
            });
        }

        return res.status(200).send(result);

    } catch (error) {
        // Capture exact crash reasons (Timeout, SSL, 403, etc.)
        return res.status(500).json({
            status: "FUNCTION_CRASH",
            message: error.message,
            stack: error.response ? error.response.data.toString() : "No stack trace available"
        });
    }
}
