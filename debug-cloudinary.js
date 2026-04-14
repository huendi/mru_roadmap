// Debug Cloudinary Configuration
console.log('=== Cloudinary Debug ===');
console.log('Cloud Name:', 'divtweyoo');
console.log('Upload Preset:', 'moutnrushmoreunit');
console.log('Upload URL:', 'https://api.cloudinary.com/v1_1/divtweyoo/upload');

// Test with different preset names
const testPresets = [
    'moutnrushmoreunit',
    'Unsigned', 
    'unsigned',
    'mru-roadmap-uploads',
    'default'
];

async function testPreset(presetName) {
    console.log(`\n--- Testing preset: ${presetName} ---`);
    
    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
    formData.append('upload_preset', presetName);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/divtweyoo/upload`, {
            method: 'POST',
            body: formData
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Response: ${text.substring(0, 200)}...`);
        
        if (response.ok) {
            console.log('✅ SUCCESS with preset:', presetName);
            return true;
        } else {
            console.log('❌ FAILED with preset:', presetName);
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR with preset ${presetName}:`, error);
        return false;
    }
}

// Test all presets
async function testAllPresets() {
    for (const preset of testPresets) {
        await testPreset(preset);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
}

// Run tests
testAllPresets();
