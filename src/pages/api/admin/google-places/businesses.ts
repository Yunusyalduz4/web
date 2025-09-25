import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { db } from '../../../server/db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return await getGooglePlacesBusinesses(req, res);
      case 'POST':
        return await createBusinessFromGooglePlaces(req, res);
      case 'PUT':
        return await updateBusiness(req, res);
      case 'DELETE':
        return await deleteBusiness(req, res);
    }
  } catch (error) {
    console.error('Google Places businesses API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getGooglePlacesBusinesses(req: NextApiRequest, res: NextApiResponse) {
  const { 
    page = 1, 
    limit = 50, 
    search, 
    city, 
    category, 
    verified,
    dataSource = 'google_places'
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereConditions = ['b.data_source = $1'];
    let queryParams: any[] = [dataSource];
    let paramIndex = 2;

    // Add search filter
    if (search) {
      whereConditions.push(`(b.name ILIKE $${paramIndex} OR b.address ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add city filter
    if (city) {
      whereConditions.push(`b.address ILIKE $${paramIndex}`);
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    // Add category filter
    if (category) {
      whereConditions.push(`bc.name = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    // Add verification filter
    if (verified !== undefined) {
      whereConditions.push(`b.is_google_verified = $${paramIndex}`);
      queryParams.push(verified === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get businesses with pagination
    const businessesQuery = `
      SELECT 
        b.*,
        bc.name as category_name,
        bc.id as category_id,
        u.name as owner_name,
        u.email as owner_email
      FROM businesses b
      LEFT JOIN business_category_mapping bcm ON b.id = bcm.business_id
      LEFT JOIN business_categories bc ON bcm.category_id = bc.id
      LEFT JOIN users u ON b.owner_user_id = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(Number(limit), offset);

    const businesses = await db.query(businessesQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM businesses b
      LEFT JOIN business_category_mapping bcm ON b.id = bcm.business_id
      LEFT JOIN business_categories bc ON bcm.category_id = bc.id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Get statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_businesses,
        COUNT(CASE WHEN b.is_google_verified = true THEN 1 END) as verified_businesses,
        COUNT(CASE WHEN b.owner_user_id IS NOT NULL THEN 1 END) as claimed_businesses,
        COUNT(CASE WHEN b.data_source = 'google_places' THEN 1 END) as google_places_businesses,
        AVG(b.google_rating) as avg_google_rating
      FROM businesses b
      WHERE b.data_source = 'google_places'
    `;

    const stats = await db.query(statsQuery);

    return res.json({
      businesses: businesses.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error getting Google Places businesses:', error);
    return res.status(500).json({ 
      message: 'Error getting businesses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function createBusinessFromGooglePlaces(req: NextApiRequest, res: NextApiResponse) {
  const { 
    placeId, 
    ownerUserId, 
    categoryId,
    customData = {}
  } = req.body;

  if (!placeId) {
    return res.status(400).json({ message: 'Place ID is required' });
  }

  try {
    // Get cached Google Places data
    const cacheResult = await db.query(`
      SELECT * FROM google_places_cache WHERE place_id = $1
    `, [placeId]);

    if (cacheResult.rows.length === 0) {
      return res.status(404).json({ message: 'Google Places data not found in cache' });
    }

    const cachedBusiness = cacheResult.rows[0];

    // Check if business already exists
    const existingBusiness = await db.query(`
      SELECT id FROM businesses WHERE google_place_id = $1
    `, [placeId]);

    if (existingBusiness.rows.length > 0) {
      return res.status(409).json({ message: 'Business already exists' });
    }

    // Create business
    const businessResult = await db.query(`
      INSERT INTO businesses (
        google_place_id, name, address, latitude, longitude,
        phone, website_url, google_rating, google_reviews_count,
        place_types, google_photos, google_business_status,
        data_source, is_google_verified, owner_user_id,
        profile_image_url, description,
        ${Object.keys(customData).length > 0 ? Object.keys(customData).join(', ') + ',' : ''}
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        ${Object.keys(customData).length > 0 ? Object.values(customData).map((_, i) => `$${18 + i}`).join(', ') + ',' : ''}
        now(), now()
      )
      RETURNING *
    `, [
      placeId,
      cachedBusiness.business_name,
      cachedBusiness.address,
      cachedBusiness.latitude,
      cachedBusiness.longitude,
      cachedBusiness.phone,
      cachedBusiness.website,
      cachedBusiness.rating,
      cachedBusiness.reviews_count,
      cachedBusiness.place_types,
      cachedBusiness.photos,
      cachedBusiness.business_status,
      'google_places',
      false,
      ownerUserId || null,
      cachedBusiness.photos ? JSON.parse(cachedBusiness.photos)[0]?.photo_reference : null,
      `Google Places business: ${cachedBusiness.business_name}`,
      ...Object.values(customData)
    ]);

    const business = businessResult.rows[0];

    // Add category mapping if categoryId provided
    if (categoryId) {
      await db.query(`
        INSERT INTO business_category_mapping (business_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT (business_id, category_id) DO NOTHING
      `, [business.id, categoryId]);
    }

    return res.json({
      message: 'Business created successfully',
      business
    });
  } catch (error) {
    console.error('Error creating business from Google Places:', error);
    return res.status(500).json({ 
      message: 'Error creating business',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function updateBusiness(req: NextApiRequest, res: NextApiResponse) {
  const { businessId } = req.query;
  const updateData = req.body;

  if (!businessId) {
    return res.status(400).json({ message: 'Business ID is required' });
  }

  try {
    // Build dynamic update query
    const updateFields = Object.keys(updateData).filter(key => 
      !['id', 'created_at', 'updated_at'].includes(key)
    );

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = updateFields.map((field, index) => 
      `${field} = $${index + 2}`
    ).join(', ');

    const updateQuery = `
      UPDATE businesses 
      SET ${setClause}, updated_at = now()
      WHERE id = $1
      RETURNING *
    `;

    const values = [businessId, ...updateFields.map(field => updateData[field])];
    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    return res.json({
      message: 'Business updated successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating business:', error);
    return res.status(500).json({ 
      message: 'Error updating business',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function deleteBusiness(req: NextApiRequest, res: NextApiResponse) {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ message: 'Business ID is required' });
  }

  try {
    // Check if business exists
    const businessResult = await db.query(`
      SELECT id, name FROM businesses WHERE id = $1
    `, [businessId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Delete business (cascade will handle related records)
    await db.query(`DELETE FROM businesses WHERE id = $1`, [businessId]);

    return res.json({
      message: `Business "${businessResult.rows[0].name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting business:', error);
    return res.status(500).json({ 
      message: 'Error deleting business',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
