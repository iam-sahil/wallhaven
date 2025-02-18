import { getNextApiKey } from './pixabayKeys.js';

export default async function handler(req, res) {
  const { api, query, page, imageUrl, id } = req.query;

  // Handle preflight CORS request (for browsers)
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers to allow requests from the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // If imageUrl is provided, directly fetch the image and return it
  if (imageUrl) {
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to fetch image. Status: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }
      const contentType = imageResponse.headers.get('Content-Type');
      res.setHeader('Content-Type', contentType || 'image/jpeg');
      const imageBuffer = await imageResponse.arrayBuffer();
      res.status(200).send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error("Error fetching image for proxy:", error);
      return res.status(500).json({
        error: 'Failed to fetch image from the source for proxy.',
        details: error.message,
      });
    }
    return;
  }

  // If 'id' is provided and the selected API is wallhaven, treat it as a wallpaper detail request
  if (api === 'wallhaven' && id) {
    let detailUrl = `https://wallhaven.cc/api/v1/w/${id}`;
    // Append API key if available (useful for NSFW wallpapers)
    const wallhavenKey = process.env.WALLHAVEN_API_KEY;
    if (wallhavenKey) {
      detailUrl += `?apikey=${wallhavenKey}`;
    }
    try {
      const detailResponse = await fetch(detailUrl);
      if (!detailResponse.ok) {
        throw new Error(
          `Failed to fetch wallpaper details: ${detailResponse.status} ${detailResponse.statusText}`
        );
      }
      const detailData = await detailResponse.json();
      return res.status(200).json(detailData);
    } catch (error) {
      console.error("Error fetching wallpaper details:", error);
      return res.status(500).json({
        error: 'Failed to fetch wallpaper details.',
        details: error.message,
      });
    }
  }

  // For search listings, ensure required parameters are present
  if (!api || !query || !page) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters (api, query, page)' });
  }

  // Validate the 'api' parameter: only allow pixabay and wallhaven
  const validApis = ['pixabay', 'wallhaven'];
  if (!validApis.includes(api)) {
    return res.status(400).json({ error: 'Invalid API selection' });
  }

  let url = '';

  // Construct the API URL based on the selected API source
  if (api === 'pixabay') {
    // Use your key cycling logic for Pixabay
    const apiKey = getNextApiKey();
    url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
      query
    )}&page=${page}&image_type=photo&per_page=50`;
  } else if (api === 'wallhaven') {
    // Construct Wallhaven search URL
    url = `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&page=${page}`;
    // If you have a Wallhaven API key (for NSFW or personalized filters), append it
    const wallhavenKey = "VF1VzNqjIOjiNs3FDE9AARL2pOlt9QvA";
    if (wallhavenKey) {
      url += `&apikey=${wallhavenKey}`;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch data from the API: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error fetching from external API (${api}):`, error);
    res.status(500).json({
      error: `Error fetching data from the API (${api}).`,
      details: error.message,
    });
  }
}
