const axios = require('axios');
const FormData = require('form-data');

export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Download video into a Buffer
        // This ensures we have the full file data before talking to Catbox
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const buffer = Buffer.from(response.data);

        // 2. Construct the Form based on Catbox API docs
        const form = new FormData();
        
        // According to docs: reqtype="fileupload"
        form.append('reqtype', 'fileupload');
        
        // According to docs: fileToUpload=(file data here)
        form.append('fileToUpload', buffer, {
            filename: fileName || 'video.mp4',
            contentType: 'video/mp4'
        });

        // 3. Post to Catbox API (https://catbox.moe/user/api.php)
        const catboxResponse = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Node.js Proxy)'
            },
            // Using a high timeout to prevent 500 errors on Vercel
            timeout: 15000 
        });

        const result = catboxResponse.data.toString().trim();

        // If it returns a URL, we are successful
        if (result.includes("https://files.catbox.moe/")) {
            return res.status(200).send(result);
        } else {
            // This captures the "Invalid uploader" or other API errors for debugging
            return res.status(422).json({
                error: "Catbox API Rejected Request",
                response_text: result,
                expected_reqtype: "fileupload"
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            error: "Proxy System Failure", 
            message: error.message 
        });
    }
}
