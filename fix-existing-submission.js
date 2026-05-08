// Run this in the browser console on your Level 5 page to fix existing submission
async function fixExistingSubmission() {
    try {
        const response = await fetch('/api/user/level5-exam');
        const data = await response.json();
        
        console.log('Current Level 5 data:', data);
        
        if (data.receiptUploaded && !data.adminDecision) {
            console.log('Fixing existing submission...');
            
            // This will set the adminDecision to 'pending' if it's missing
            const updateResponse = await fetch('/api/user/level5-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminDecision: 'pending',
                    currentStep: data.currentStep || 4
                })
            });
            
            if (updateResponse.ok) {
                console.log('✅ Fixed existing submission!');
                alert('Submission fixed! Check admin approvals now.');
            } else {
                console.log('❌ Failed to fix submission');
            }
        } else {
            console.log('Submission looks correct or no receipt uploaded');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the fix
fixExistingSubmission();
