import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getGooglePlacesService } from '../../../../services/googlePlacesService';
import MarmaraDataFetcher, { MARMARA_CITIES } from '../../../../services/marmaraDataFetcher';

// Global fetcher instance
let dataFetcher: MarmaraDataFetcher | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      return await getProgress(req, res);
    }

    const { action, city } = req.body;

    switch (action) {
      case 'start_marmara_fetch':
        return await startMarmaraFetch(req, res);
      
      case 'fetch_city':
        return await fetchCity(req, res, city);
      
      case 'get_stats':
        return await getStats(req, res);
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Marmara API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function startMarmaraFetch(req: NextApiRequest, res: NextApiResponse) {
  if (dataFetcher && dataFetcher.isFetching()) {
    return res.status(409).json({ message: 'Data fetching is already in progress' });
  }

  const googlePlacesService = getGooglePlacesService();
  dataFetcher = new MarmaraDataFetcher(googlePlacesService);

  // Set up progress tracking
  dataFetcher.setProgressCallback((progress) => {
    console.log('Marmara fetch progress:', progress);
  });

  // Start fetching in background
  dataFetcher.fetchAllMarmaraData()
    .then((result) => {
      console.log('Marmara fetch completed:', result);
    })
    .catch((error) => {
      console.error('Marmara fetch error:', error);
    });

  return res.json({ 
    message: 'Marmara region data fetch started',
    totalCities: MARMARA_CITIES.length,
    estimatedDuration: '3-5 hours'
  });
}

async function fetchCity(req: NextApiRequest, res: NextApiResponse, cityName: string) {
  if (!cityName) {
    return res.status(400).json({ message: 'City name is required' });
  }

  const googlePlacesService = getGooglePlacesService();
  const dataFetcher = new MarmaraDataFetcher(googlePlacesService);

  // Find city in Marmara cities list
  const city = MARMARA_CITIES.find(c => 
    c.name.toLowerCase() === cityName.toLowerCase()
  );

  if (!city) {
    return res.status(404).json({ message: 'City not found in Marmara region' });
  }

  try {
    await dataFetcher.fetchCityData(city);
    
    return res.json({ 
      message: `Data fetch completed for ${city.name}`,
      city: city.name,
      coordinates: { lat: city.lat, lng: city.lng },
      districts: city.districts?.length || 0
    });
  } catch (error) {
    console.error(`Error fetching city ${cityName}:`, error);
    return res.status(500).json({ 
      message: `Error fetching data for ${cityName}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getProgress(req: NextApiRequest, res: NextApiResponse) {
  if (!dataFetcher) {
    return res.json({ 
      isRunning: false,
      progress: null
    });
  }

  const progress = dataFetcher.getProgress();
  const isRunning = dataFetcher.isFetching();

  return res.json({
    isRunning,
    progress: isRunning ? progress : null
  });
}

async function getStats(req: NextApiRequest, res: NextApiResponse) {
  const googlePlacesService = getGooglePlacesService();
  const dataFetcher = new MarmaraDataFetcher(googlePlacesService);

  try {
    const stats = await dataFetcher.getStats();
    
    return res.json({
      ...stats,
      totalCities: MARMARA_CITIES.length,
      isRunning: dataFetcher.isFetching()
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return res.status(500).json({ 
      message: 'Error getting stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
