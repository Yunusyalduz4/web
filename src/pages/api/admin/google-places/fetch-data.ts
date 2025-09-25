import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getGooglePlacesService } from '../../../../services/googlePlacesService';
import TurkeyDataFetcher from '../../../../services/turkeyDataFetcher';

// Global fetcher instance
let dataFetcher: TurkeyDataFetcher | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { action, city, location } = req.body;

    switch (action) {
      case 'start_full_fetch':
        return await startFullFetch(req, res);
      
      case 'fetch_city':
        return await fetchCity(req, res, city);
      
      case 'fetch_location':
        return await fetchLocation(req, res, location);
      
      case 'process_cache':
        return await processCache(req, res);
      
      case 'get_progress':
        return await getProgress(req, res);
      
      case 'get_stats':
        return await getStats(req, res);
      
      case 'clean_cache':
        return await cleanCache(req, res);
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Google Places API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function startFullFetch(req: NextApiRequest, res: NextApiResponse) {
  if (dataFetcher && dataFetcher.isFetching()) {
    return res.status(409).json({ message: 'Data fetching is already in progress' });
  }

  const googlePlacesService = getGooglePlacesService();
  dataFetcher = new TurkeyDataFetcher(googlePlacesService);

  // Set up progress tracking
  dataFetcher.setProgressCallback((progress) => {
    console.log('Fetch progress:', progress);
  });

  // Start fetching in background
  dataFetcher.fetchAllTurkeyData()
    .then((result) => {
      console.log('Full fetch completed:', result);
    })
    .catch((error) => {
      console.error('Full fetch error:', error);
    });

  return res.json({ 
    message: 'Full data fetch started',
    estimatedDuration: '2-4 hours'
  });
}

async function fetchCity(req: NextApiRequest, res: NextApiResponse, cityName: string) {
  if (!cityName) {
    return res.status(400).json({ message: 'City name is required' });
  }

  const googlePlacesService = getGooglePlacesService();
  const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

  // Find city in Turkey cities list
  const city = TURKEY_CITIES.find(c => 
    c.name.toLowerCase() === cityName.toLowerCase()
  );

  if (!city) {
    return res.status(404).json({ message: 'City not found' });
  }

  try {
    await dataFetcher.fetchCityData(city);
    
    return res.json({ 
      message: `Data fetch completed for ${city.name}`,
      city: city.name,
      coordinates: { lat: city.lat, lng: city.lng }
    });
  } catch (error) {
    console.error(`Error fetching city ${cityName}:`, error);
    return res.status(500).json({ 
      message: `Error fetching data for ${cityName}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fetchLocation(req: NextApiRequest, res: NextApiResponse, location: { lat: number; lng: number; radius?: number }) {
  if (!location || !location.lat || !location.lng) {
    return res.status(400).json({ message: 'Location coordinates are required' });
  }

  const googlePlacesService = getGooglePlacesService();
  
  try {
    const businesses = await googlePlacesService.searchBeautyBusinesses(
      { lat: location.lat, lng: location.lng },
      location.radius || 50000
    );

    return res.json({
      message: `Found ${businesses.length} businesses`,
      location,
      businesses: businesses.map(b => ({
        place_id: b.place_id,
        name: b.name,
        address: b.formatted_address,
        rating: b.rating,
        types: b.types,
        business_status: b.business_status
      }))
    });
  } catch (error) {
    console.error('Error fetching location data:', error);
    return res.status(500).json({ 
      message: 'Error fetching location data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processCache(req: NextApiRequest, res: NextApiResponse) {
  const googlePlacesService = getGooglePlacesService();
  const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

  try {
    const result = await dataFetcher.processCachedData();
    
    return res.json({
      message: 'Cache processing completed',
      result
    });
  } catch (error) {
    console.error('Error processing cache:', error);
    return res.status(500).json({ 
      message: 'Error processing cache',
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
  const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

  try {
    const stats = await dataFetcher.getCacheStats();
    
    return res.json({
      cache: stats,
      cities: TURKEY_CITIES.length,
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

async function cleanCache(req: NextApiRequest, res: NextApiResponse) {
  const googlePlacesService = getGooglePlacesService();
  const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

  try {
    const deletedCount = await dataFetcher.cleanExpiredCache();
    
    return res.json({
      message: `Cleaned ${deletedCount} expired cache entries`
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    return res.status(500).json({ 
      message: 'Error cleaning cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Import TURKEY_CITIES from the service
import { TURKEY_CITIES } from '../../../../services/turkeyDataFetcher';
