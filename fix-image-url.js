const fs = require('fs');
const content = fs.readFileSync('src/services/firebase.service.js', 'utf8');

// Fix the image URL to use vendor/image path
const fixed = content.replace(
  "const imageUrl = process.env.NEXT_PUBLIC_API_URL + '/api/images/' + imageId;",
  "const imageUrl = process.env.NEXT_PUBLIC_API_URL + '/api/vendor/image/' + imageId;"
);

fs.writeFileSync('src/services/firebase.service.js', fixed);
console.log('✅ Fixed image URL path to use /api/vendor/image/:imageId');
