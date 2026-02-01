import { test, expect } from '@playwright/test';

test('basic flow', async ({ page }) => {
    // Mock generation API to avoid costs and delays
    await page.route('/api/generate', async route => {
        // Simulate delay
        await new Promise(f => setTimeout(f, 1000));
        await route.fulfill({ json: { success: true, jobId: 'mock-job-id' } });
    });

    // Navigate to home
    await page.goto('/');

    // Verify Title
    await expect(page.getByText('Create Your Podcast')).toBeVisible();

    // Enter Topic
    const topicInput = page.getByPlaceholder(/recording|what should the ai talk about/i);
    await topicInput.fill('The history of space exploration');

    // Verify Generate button is enabled
    const generateBtn = page.getByRole('button', { name: /generate voice/i });
    await expect(generateBtn).toBeEnabled();

    // Click Generate
    await generateBtn.click();

    // Check for Generating state
    await expect(page.getByText('Generating...')).toBeVisible();
});
