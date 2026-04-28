import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Fetch video from source
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(response.data);

        // 2. Build multipart form with userhash
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('userhash', process.env.CATBOX_USERHASH); // store in Vercel env vars
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Upload to Catbox
        const uploadResponse = await axios.post(
            'https://catbox.moe/user/api.php',
            form,
            {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60000
            }
        );

        const result = uploadResponse.data.toString().trim();

        // 4. Validate response
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
