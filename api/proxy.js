import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
    const { videoUrl, id, fileName } = req.query;

    // --- UPLOAD LOGIC ---
    if (videoUrl) {
        try {
            const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
            const form = new FormData();
            form.append('files[]', Buffer.from(videoRes.data), fileName || 'video.mp4');

            const uploadRes = await axios.post('https://qu.ax/upload', form, {
                headers: form.getHeaders()
            });

            if (uploadRes.data.success) {
                const quaxUrl = uploadRes.data.files[0].url;
                const fileId = quaxUrl.split('/').pop();
                // This returns the clean URL you want!
                return res.status(200).send(`https://${req.headers.host}/${fileId}.mp4`);
            }
            return res.status(422).json(uploadRes.data);
        } catch (err) {
            return res.status(500).send("Upload Error: " + err.message);
        }
    }

    // --- MIRROR LOGIC (.mp4 handler) ---
    if (id) {
        // Strip .mp4 if it was passed in the query ID
        const cleanId = id.replace('.mp4', '');
        const targetUrl = `https://qu.ax/x/${cleanId}.mp4`;

        try {
            const stream = await axios.get(targetUrl, {
                headers: {
                    'Referer': `https://qu.ax/${cleanId}.mp4/`,
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)'
                },
                responseType: 'arraybuffer'
            });

            // Tell the browser this IS a video file
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(stream.data);
        } catch (err) {
            return res.status(404).send("Video not found or Qu.ax blocked the request.");
        }
    }

    return res.status(400).send("Usage: /upload?videoUrl=LINK or /ID.mp4");
}
