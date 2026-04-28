import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Fetch video
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(response.data);

        // 2. Build multipart form
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Post the form OBJECT directly — not form.getBuffer()
        const catboxResponse = await axios.post(
            'https://catbox.moe/user/api.php',
            form,                        // ✅ stream the form, don't flatten it
            {
                headers: {
                    ...form.getHeaders(), // lets form-data set the correct boundary
                },
                maxBodyLength: Infinity,  // prevent axios from cutting off large files
                maxContentLength: Infinity,
                timeout: 60000
            }
        );

        const result = catboxResponse.data.toString().trim();

        if (!result.startsWith('https://files.catbox.moe/')) {
            return res.status(422).json({
                status: 'API_REJECTION',
                catbox_response: result,
                debug_info: {
                    file_size_bytes: buffer.length,
                    content_type_header: form.getHeaders()['content-type']
                }
            });
        }

        return res.status(200).send(result);

    } catch (error) {
        return res.status(500).json({
            status: 'FUNCTION_CRASH',
            message: error.message,
            stack: error.response ? error.response.data.toString() : 'No response body'
        });
    }
}
