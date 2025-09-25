#!/usr/bin/env ts-node

/**
 * Google Places Integration Test Script
 * 
 * This script tests the Google Places integration and data fetching system
 * Run with: npm run test:google-places
 */

import { config } from 'dotenv';
import { GooglePlacesService } from '../services/googlePlacesService';
import TurkeyDataFetcher from '../services/turkeyDataFetcher';
import { pool as db } from '../server/db/index';

// Load environment variables
config();

async function testGooglePlacesService() {
  console.log('🧪 Testing Google Places Service...');
  
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }

    const googlePlacesService = new GooglePlacesService(apiKey);

    // Test 1: Search for beauty salons in Istanbul
    console.log('\n📍 Test 1: Searching for beauty salons in Istanbul...');
    const istanbulResults = await googlePlacesService.searchPlaces({
      location: '41.0082,28.9784',
      radius: 5000,
      type: 'beauty_salon',
      language: 'tr',
      region: 'tr',
    });

    console.log(`✅ Found ${istanbulResults.length} beauty salons in Istanbul`);
    if (istanbulResults.length > 0) {
      const firstResult = istanbulResults[0];
      console.log(`   Example: ${firstResult.name} - ${firstResult.formatted_address}`);
      console.log(`   Rating: ${firstResult.rating || 'N/A'}, Reviews: ${firstResult.user_ratings_total || 'N/A'}`);
    }

    // Test 2: Get detailed place information
    if (istanbulResults.length > 0) {
      console.log('\n🔍 Test 2: Getting detailed place information...');
      const placeDetails = await googlePlacesService.getPlaceDetails(istanbulResults[0].place_id);
      
      if (placeDetails) {
        console.log(`✅ Place details retrieved for: ${placeDetails.name}`);
        console.log(`   Phone: ${placeDetails.formatted_phone_number || 'N/A'}`);
        console.log(`   Website: ${placeDetails.website || 'N/A'}`);
        console.log(`   Types: ${placeDetails.types.join(', ')}`);
        console.log(`   Status: ${placeDetails.business_status || 'N/A'}`);
      }
    }

    // Test 3: Search multiple beauty business types
    console.log('\n🎨 Test 3: Searching for multiple beauty business types...');
    const beautyBusinesses = await googlePlacesService.searchBeautyBusinesses(
      { lat: 41.0082, lng: 28.9784 },
      10000
    );

    console.log(`✅ Found ${beautyBusinesses.length} beauty-related businesses`);
    
    // Group by type
    const businessTypes: { [key: string]: number } = {};
    beautyBusinesses.forEach(business => {
      const category = googlePlacesService.getBusinessCategory(business.types);
      businessTypes[category] = (businessTypes[category] || 0) + 1;
    });

    console.log('   Business types found:');
    Object.entries(businessTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Google Places Service test failed:', error);
    return false;
  }
}

async function testTurkeyDataFetcher() {
  console.log('\n🇹🇷 Testing Turkey Data Fetcher...');
  
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }

    const googlePlacesService = new GooglePlacesService(apiKey);
    const dataFetcher = new TurkeyDataFetcher(googlePlacesService);

    // Test 1: Fetch data for a single city (Ankara)
    console.log('\n🏙️ Test 1: Fetching data for Ankara...');
    const ankara = {
      name: 'Ankara',
      lat: 39.9334,
      lng: 32.8597,
      population: 5663322,
    };

    await dataFetcher.fetchCityData(ankara);
    console.log('✅ Ankara data fetch completed');

    // Test 2: Check cache statistics
    console.log('\n📊 Test 2: Checking cache statistics...');
    const stats = await dataFetcher.getCacheStats();
    console.log(`✅ Cache stats: ${stats.total} total, ${stats.expired} expired`);
    
    if (stats.byCity.length > 0) {
      console.log('   Top cities in cache:');
      stats.byCity.slice(0, 5).forEach(city => {
        console.log(`     ${city.city}: ${city.count} businesses`);
      });
    }

    // Test 3: Process cached data
    console.log('\n⚙️ Test 3: Processing cached data...');
    const processResult = await dataFetcher.processCachedData();
    console.log(`✅ Processing completed: ${processResult.processed} processed, ${processResult.created} created, ${processResult.updated} updated, ${processResult.errors} errors`);

    return true;
  } catch (error) {
    console.error('❌ Turkey Data Fetcher test failed:', error);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing Database Connection...');
  
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    console.log(`✅ Database connected at: ${result.rows[0].current_time}`);

    // Test Google Places cache table
    const cacheResult = await db.query('SELECT COUNT(*) as count FROM google_places_cache');
    console.log(`✅ Google Places cache table: ${cacheResult.rows[0].count} entries`);

    // Test businesses table with Google Places data
    const businessResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM businesses 
      WHERE data_source = 'google_places'
    `);
    console.log(`✅ Google Places businesses: ${businessResult.rows[0].count} entries`);

    // Test categories
    const categoryResult = await db.query('SELECT COUNT(*) as count FROM business_categories');
    console.log(`✅ Business categories: ${categoryResult.rows[0].count} entries`);

    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Google Places Integration Tests...\n');
  
  const results = {
    database: false,
    googlePlaces: false,
    turkeyDataFetcher: false,
  };

  // Run tests
  results.database = await testDatabaseConnection();
  results.googlePlaces = await testGooglePlacesService();
  results.turkeyDataFetcher = await testTurkeyDataFetcher();

  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log(`   Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Google Places Service: ${results.googlePlaces ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Turkey Data Fetcher: ${results.turkeyDataFetcher ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Google Places integration is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }

  // Close database connection
  await db.end();
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { testGooglePlacesService, testTurkeyDataFetcher, testDatabaseConnection };
