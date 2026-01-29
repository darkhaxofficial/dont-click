'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating psychologically provocative messages to increase tension in the "Don't Click" game.
 *
 * The flow utilizes a prompt to generate messages based on the current game state and other parameters.
 * The generated message is intended to subtly increase tension and self-doubt in the player.
 *
 * @exports generateTensionMessage - An async function that triggers the message generation flow.
 * @exports TensionMessageInput - The input type for the generateTensionMessage function.
 * @exports TensionMessageOutput - The output type for the generateTensionMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TensionMessageInputSchema = z.object({
  gameState: z
    .string()
    .describe("The current state of the game (e.g., 'initial', 'ongoing')."),
  timeElapsed: z
    .number()
    .describe('The time elapsed since the game started, in milliseconds.'),
});
export type TensionMessageInput = z.infer<typeof TensionMessageInputSchema>;

const TensionMessageOutputSchema = z.object({
  message: z
    .string()
    .describe(
      'A psychologically provocative message designed to increase tension and self-doubt.'
    ),
});
export type TensionMessageOutput = z.infer<typeof TensionMessageOutputSchema>;

export async function generateTensionMessage(
  input: TensionMessageInput
): Promise<TensionMessageOutput> {
  return generateTensionMessageFlow(input);
}

const tensionMessagePrompt = ai.definePrompt({
  name: 'tensionMessagePrompt',
  input: {schema: TensionMessageInputSchema},
  output: {schema: TensionMessageOutputSchema},
  prompt: `You are the AI for a psychological endurance game called "Don't Click."

  Your role is to generate subtle, psychologically provocative messages designed to increase tension and self-doubt in the player, without ever explicitly stating the rules of the game or what will happen if they click.

  The messages should be short, ambiguous, and unsettling. Focus on creating a feeling of unease and anticipation.

  Examples of good messages:
  * "Are you sure you understand what's at stake?"
  * "Is this really worth it?"
  * "Any second now..."
  * "You're being watched."
  * "They know."
  * "How much longer can you resist?"
  * "It's inevitable."
  * "What are you waiting for?"

  The current game state is: {{{gameState}}}
  The time elapsed is: {{{timeElapsed}}} milliseconds.

  Generate a single message that fits the above criteria:
  Message: `,
});

const generateTensionMessageFlow = ai.defineFlow(
  {
    name: 'generateTensionMessageFlow',
    inputSchema: TensionMessageInputSchema,
    outputSchema: TensionMessageOutputSchema,
  },
  async input => {
    const {output} = await tensionMessagePrompt(input);
    return output!;
  }
);
