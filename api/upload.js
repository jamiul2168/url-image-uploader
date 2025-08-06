// File: /api/upload.js
import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the image URL from the request body
  const { imageUrl } = request.body;

  if (!imageUrl) {
    return response.status(400).json({ error: 'Image URL is required' });
  }

  // Get the API key from environment variables for security
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: 'Server configuration error: API key not set' });
  }
  
  try {
    // Step 1: Fetch the image from the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image. Status: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.buffer();
    
    // Step 2: Prepare form data to send to ImgBB
    const form = new FormData();
    // Convert buffer to base64 string for the API
    form.append('image', imageBuffer.toString('base64'));

    // Step 3: Upload the image to ImgBB
    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: form,
    });
    
    const imgbbResult = await imgbbResponse.json();

    if (!imgbbResult.success) {
      throw new Error(imgbbResult.error?.message || 'ImgBB API error');
    }

    // Step 4: Send the new URL back to the frontend
    return response.status(200).json({ url: imgbbResult.data.url });

  } catch (error) {
    console.error('Upload process failed:', error);
    return response.status(500).json({ error: error.message });
  }
}