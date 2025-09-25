require('dotenv').config();

async function fetchMarmaraData() {
  console.log('🚀 Starting Marmara Region Data Fetch...');
  
  try {
    // Start Marmara fetch
    console.log('📡 Starting full Marmara fetch...');
    const startResponse = await fetch('http://localhost:3000/api/admin/marmara/fetch-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'start_marmara_fetch'
      })
    });
    
    if (startResponse.ok) {
      const result = await startResponse.json();
      console.log('✅ Fetch started:', result);
      
      // Monitor progress
      console.log('\n📊 Monitoring progress...');
      let isRunning = true;
      let lastProgress = null;
      
      while (isRunning) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const progressResponse = await fetch('http://localhost:3000/api/admin/marmara/fetch-data');
        if (progressResponse.ok) {
          const progress = await progressResponse.json();
          
          if (progress.isRunning && progress.progress) {
            const current = progress.progress;
            
            // Only log if progress changed
            if (!lastProgress || 
                current.currentCity !== lastProgress.currentCity ||
                current.totalBusinesses !== lastProgress.totalBusinesses) {
              
              console.log(`\n📍 ${current.currentCity} (${current.completedCities}/${current.totalCities})`);
              if (current.currentDistrict) {
                console.log(`   District: ${current.currentDistrict}`);
              }
              console.log(`   Businesses found: ${current.totalBusinesses}`);
              console.log(`   Errors: ${current.errors}`);
              
              if (current.estimatedCompletion) {
                console.log(`   ETA: ${new Date(current.estimatedCompletion).toLocaleTimeString()}`);
              }
              
              lastProgress = current;
            }
          } else {
            isRunning = false;
            console.log('\n✅ Fetch completed!');
            
            // Get final stats
            const statsResponse = await fetch('http://localhost:3000/api/admin/marmara/fetch-data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'get_stats'
              })
            });
            
            if (statsResponse.ok) {
              const stats = await statsResponse.json();
              console.log('\n📈 Final Statistics:');
              console.log(`Total businesses: ${stats.totalBusinesses}`);
              console.log('\nBy City:');
              stats.byCity.forEach(city => {
                console.log(`  ${city.city}: ${city.count}`);
              });
              console.log('\nBy Category:');
              stats.byCategory.forEach(category => {
                console.log(`  ${category.category}: ${category.count}`);
              });
            }
            break;
          }
        } else {
          console.log('❌ Progress check failed:', progressResponse.status);
          break;
        }
      }
    } else {
      const error = await startResponse.text();
      console.log('❌ Failed to start fetch:', error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run fetch
fetchMarmaraData().then(() => {
  console.log('\n🎉 Marmara data fetch process completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fetch process failed:', error);
  process.exit(1);
});
