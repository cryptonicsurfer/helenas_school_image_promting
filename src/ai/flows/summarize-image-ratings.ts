'use server';

/**
 * @fileOverview Summarizes image ratings (thumbs up/down) to understand prompt effectiveness.
 *
 * - summarizeImageRatings - A function to summarize image ratings.
 * - SummarizeImageRatingsInput - The input type for the summarizeImageRatings function.
 * - SummarizeImageRatingsOutput - The return type for the summarizeImageRatings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeImageRatingsInputSchema = z.object({
  imageRatings: z
    .array(
      z.object({
        imageId: z.string(),
        prompt: z.string(),
        thumbsUp: z.number(),
        thumbsDown: z.number(),
      })
    )
    .describe('An array of image ratings, including image ID, prompt, thumbs up, and thumbs down counts.'),
});
export type SummarizeImageRatingsInput = z.infer<typeof SummarizeImageRatingsInputSchema>;

const SummarizeImageRatingsOutputSchema = z.object({
  summary: z.string().describe('A summary of the image ratings, highlighting effective prompts.'),
});
export type SummarizeImageRatingsOutput = z.infer<typeof SummarizeImageRatingsOutputSchema>;

export async function summarizeImageRatings(input: SummarizeImageRatingsInput): Promise<SummarizeImageRatingsOutput> {
  return summarizeImageRatingsFlow(input);
}

const summarizeImageRatingsPrompt = ai.definePrompt({
  name: 'summarizeImageRatingsPrompt',
  input: {schema: SummarizeImageRatingsInputSchema},
  output: {schema: SummarizeImageRatingsOutputSchema},
  prompt: `You are an AI assistant that analyzes image ratings data and provides a summary of the most and least effective prompts.

Analyze the following image ratings data:

{{#each imageRatings}}
Image ID: {{this.imageId}}
Prompt: {{this.prompt}}
Thumbs Up: {{this.thumbsUp}}
Thumbs Down: {{this.thumbsDown}}
{{/each}}

Provide a concise summary of the data, highlighting which prompts are most effective (high thumbs up, low thumbs down) and which are least effective (low thumbs up, high thumbs down).
Focus on providing insights that will help improve the prompts used in the future.
`,
});

const summarizeImageRatingsFlow = ai.defineFlow(
  {
    name: 'summarizeImageRatingsFlow',
    inputSchema: SummarizeImageRatingsInputSchema,
    outputSchema: SummarizeImageRatingsOutputSchema,
  },
  async input => {
    const {output} = await summarizeImageRatingsPrompt(input);
    return output!;
  }
);
