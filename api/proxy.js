export default async function handler(req, res) {
    const { videoUrl, fileName } = req.query;

    if (!videoUrl) return res.status(400).send("Error: Missing videoUrl");

    try {
        // 1. Download safe, uncorrupted MP4 from Instagram using Vercel's clean IP
        const response = await fetch(videoUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const videoBlob = await response.blob();

        // 2. Upload to Pomf (which allows Vercel connections)
        const formData = new FormData();
        formData.append('files[]', videoBlob, fileName || 'video.mp4');

        const uploadResponse = await fetch('https://pomf.lain.la/upload.php', {
            method: 'POST',
            body: formData
        });

        const result = await uploadResponse.json();

        // 3. Return the new video URL to your InfinityFree server
        if (result.success && result.files && result.files.length > 0) {
            return res.status(200).send(result.files[0].url);
        } else {
            return res.status(422).json({ error: 'Upload Rejected', details: result });
        }

    } catch (error) {
        return res.status(500).json({ status: 'CRASH', message: error.message });
    }
}
