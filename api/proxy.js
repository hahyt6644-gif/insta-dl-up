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

        // 2. Get best available GoFile upload server
        const serverRes = await axios.get('https://api.gofile.io/servers');
        const server = serverRes.data.data.servers[0].name;

        // 3. Build multipart form
        const form = new FormData();
        form.append('file', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 4. Upload to GoFile
        const uploadResponse = await axios.post(
            `https://${server}.gofile.io/uploadFile`,
            form,
            {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60000
            }
        );

        const data = uploadResponse.data;

        // 5. Validate response
        if (data.status !== 'ok') {
            return res.status(422).json({
                status: 'API_REJECTION',
                gofile_response: data,
                debug_info: {
                    file_size_bytes: buffer.length,
                    server_used: server
                }
            });
        }

        // Returns the shareable download page URL
        return res.status(200).json({
            url: data.data.downloadPage,   // https://gofile.io/d/XXXXXX
            fileId: data.data.fileId,
            server: server
        });

    } catch (error) {
        return res.status(500).json({
            status: 'FUNCTION_CRASH',
            message: error.message,
            stack: error.response ? error.response.data.toString() : 'No response body'
        });
    }
}
