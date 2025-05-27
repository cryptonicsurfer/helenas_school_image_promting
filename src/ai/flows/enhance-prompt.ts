'use server';

/**
 * @fileOverview Enhances a user-provided prompt from a statistical development perspective and generates an image based on the enhanced prompt.
 *
 * - enhancePromptAndGenerateImage - A function that takes a user prompt, enhances it using Gemini, and generates an image using Google Imagen 3.
 * - EnhancePromptAndGenerateImageInput - The input type for the enhancePromptAndGenerateImage function.
 * - EnhancePromptAndGenerateImageOutput - The return type for the enhancePromptAndGenerateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhancePromptAndGenerateImageInputSchema = z.object({
  userPrompt: z
    .string()
    .describe('The prompt provided by the user to be enhanced and used for image generation.'),
});
export type EnhancePromptAndGenerateImageInput = z.infer<typeof EnhancePromptAndGenerateImageInputSchema>;

const EnhancePromptAndGenerateImageOutputSchema = z.object({
  enhancedPrompt: z
    .string()
    .describe('The prompt after being enhanced from a statistical development perspective.'),
  imageDataUri: z
    .string()
    .describe(
      'The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // escaped quotes for JSON
    ),
});
export type EnhancePromptAndGenerateImageOutput = z.infer<typeof EnhancePromptAndGenerateImageOutputSchema>;

export async function enhancePromptAndGenerateImage(
  input: EnhancePromptAndGenerateImageInput
): Promise<EnhancePromptAndGenerateImageOutput> {
  return enhancePromptAndGenerateImageFlow(input);
}

const enhancePrompt = ai.definePrompt({
  name: 'enhancePrompt',
  input: {schema: EnhancePromptAndGenerateImageInputSchema},
  output: {schema: z.object({enhancedPrompt: z.string()})},
  prompt: `# Prompt för AI-assistent inom kommunal stadsutveckling

Du är en AI-assistent som specialiserar sig på att förbättra och utveckla prompter från ungdomar, särskilt inom området **stadsutveckling och kommunal planering**. Din uppgift är att ta emot ungdomars idéer, visioner och förslag för hur deras kommun kan utvecklas, och sedan förbättra och strukturera dessa så att de blir tydligare och mer användbara för kommunala beslutsfattare.

## Ditt uppdrag:
- **Förstärk ungdomarnas röst** - Gör deras idéer mer konkreta och genomförbara utan att förlora den ursprungliga visionen
- **Behåll autenticiteten** - Var noga med att inte avvika för långt från ungdomarnas ursprungliga mening och intention
- **Strukturera för kommunen** - Presentera förslagen på ett sätt som kommunala tjänstemän och politiker lätt kan förstå och arbeta vidare med
- **Fokusera på genomförbarhet** - Hjälp till att omvandla drömmar till realistiska projekt och initiativ

## Vad du ska göra:
1. Ta emot ungdomarnas råa idéer och visioner om stadsutveckling
2. Förtydliga och strukturera budskapet
3. Behåll känslan och passionen i det ursprungliga förslaget
4. Lägg till relevant kontext för kommunal planering där det behövs
5. Föreslå konkreta nästa steg för genomförande

## Exempel på områden du kan hjälpa med:
- Förslag på nya mötesplatser och aktivitetsytor
- Idéer för miljövänlig transport och infrastruktur
- Visioner för kulturella och kreativa utrymmen
- Förslag på bostadslösningar för unga
- Initiativ för hållbar utveckling och miljötänk
- Digitala lösningar för medborgardeltagande

**Kom ihåg:** Ditt mål är att fungera som en brygga mellan ungdomarnas kreativitet och kommunens beslutsprocesser, så att fler ungdomsidéer faktiskt kan bli verklighet.

prompten från din elevgrupp ser ut så här:

{{{userPrompt}}}


** VIKTIGT:**
Din prompt, ska syfta till att ta fram antingen "sketcher", "photorealistiska skildringar", eller "urban planning mockups".

Din förbättrade och strukturerade prompt:
`,
});

const enhancePromptAndGenerateImageFlow = ai.defineFlow(
  {
    name: 'enhancePromptAndGenerateImageFlow',
    inputSchema: EnhancePromptAndGenerateImageInputSchema,
    outputSchema: EnhancePromptAndGenerateImageOutputSchema,
  },
  async input => {
    const {output: enhancePromptOutput} = await enhancePrompt(input);
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: enhancePromptOutput!.enhancedPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {
      enhancedPrompt: enhancePromptOutput!.enhancedPrompt,
      imageDataUri: Array.isArray(media) ? media[0]?.url : media?.url,
    };
  }
);
