export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Fetch video from source using native fetch
        const response = await fetch(videoUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

        // 2. Convert to Blob
        const videoBlob = await response.blob();

        // 3. Build multipart form using NATIVE FormData
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('userhash', "66de6ba5258e90b67b0909a36"); // Keep your hash here
        formData.append('fileToUpload', videoBlob, fileName || 'video.mp4');

        // 4. Upload to Catbox
        // Native fetch handles the "multipart/form-data" boundaries automatically!
        const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formData
        });

        const result = await catboxResponse.text();

        // 5. Validate response
        if (result.includes('https://files.catbox.moe/')) {
            return res.status(200).send(result.trim());
        } else {
            return res.status(422).json({
                status: 'API_REJECTION',
                catbox_response: result, // Will now show the actual error message
                debug_info: {
                    url: videoUrl
                }
            });
        }

    } catch (error) {
        return res.status(500).json({
            status: 'FUNCTION_CRASH',
            message: error.message
        });
    }
}
