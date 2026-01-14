import { test, expect } from '@playwright/test';
import { mockServerFor } from './test-utils';

test('should export agent metadata default case', async ({ page }) => {
    const collector = mockServerFor(page);
    await page.goto('/fixtures/use-document-load.html');

    const spans = await collector.getSpans();
    const attribs = spans[0].resource.attributes;
    
    // Test OTel SDK add its metadata
    expect(attribs['telemetry.sdk.language']).toStrictEqual('webjs');
    expect(attribs['telemetry.sdk.name']).toStrictEqual('opentelemetry');
    expect(attribs['telemetry.sdk.version']).toBeDefined();
    // Test metadata from the distro
    expect(attribs['telemetry.distro.name']).toStrictEqual('elastic');
    expect(attribs['telemetry.distro.version']).toBeDefined();
});

