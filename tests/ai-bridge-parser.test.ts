import { describe, it, expect } from 'vitest';
import { parseExternalAIResponse } from '@/lib/ai-bridge/parser';

describe('AI Bridge Response Parser', () => {
  const samplePastedOutput = `
Here are the opportunities I found:

### 1. Thiel Fellowship 2026
- Organization: The Thiel Foundation
- Official URL: https://thielfellowship.org
- Category: Fellowship
- Deadline: 2026-12-31
- Funding: $100,000 grant
- Eligibility: Under 22 years old, builders leaving standard paths.
- Why it fits my profile: Direct match for ambitious independent builders.

### 2. HackMIT 2026
- Organization: MIT Tech Club
- Official URL: https://hackmit.org
- Category: Hackathon
- Deadline: 2026-08-15
- Funding: Travel stipends for selected undergraduate teams
- Eligibility: Enrolled undergraduate students.

Also, since you mentioned you have a strong background in robotics and agentic workflows, consider looking into autonomous systems programs.
`;

  it('extracts structured candidate opportunities from external LLM markdown', () => {
    const result = parseExternalAIResponse(samplePastedOutput);

    expect(result.rawDetectedCount).toBe(2);
    expect(result.candidates.length).toBe(2);

    const thiel = result.candidates.find((c) => c.title.includes('Thiel'));
    expect(thiel).toBeDefined();
    expect(thiel?.organizer).toBe('The Thiel Foundation');
    expect(thiel?.official_url).toContain('https://thielfellowship.org');
    expect(thiel?.deadline).toBeNull();
    expect(thiel?.deadline_raw_text).toBe('2026-12-31');
    expect(thiel?.status).toBe('draft');
    expect(thiel?.source_status).toBe('unknown');
    expect(thiel?.funding_description).toContain('$100,000');

    const hackmit = result.candidates.find((c) => c.title.includes('HackMIT'));
    expect(hackmit).toBeDefined();
    expect(hackmit?.official_url).toContain('https://hackmit.org');
  });

  it('detects profile inferences from LLM text without silently saving them', () => {
    const result = parseExternalAIResponse(samplePastedOutput);
    expect(result.suggestedProfileUpdates.length).toBeGreaterThan(0);
    const mentionsRobotics = result.suggestedProfileUpdates.some((u) => u.toLowerCase().includes('robotics'));
    expect(mentionsRobotics).toBe(true);
  });

  it('handles empty or malformed text gracefully', () => {
    const result = parseExternalAIResponse('');
    expect(result.candidates).toEqual([]);
    expect(result.rawDetectedCount).toBe(0);
  });
});
