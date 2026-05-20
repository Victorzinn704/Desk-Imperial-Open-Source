export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

type BuildGeminiInsightRequestBodyInput = {
  prompt: string
  maxOutputTokens: number
  thinkingBudget: number
}

export function buildGeminiInsightRequestBody(input: BuildGeminiInsightRequestBodyInput) {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: input.prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.45,
      topP: 0.9,
      maxOutputTokens: input.maxOutputTokens,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: input.thinkingBudget },
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          forecast: { type: 'STRING' },
          opportunities: { type: 'ARRAY', items: { type: 'STRING' } },
          risks: { type: 'ARRAY', items: { type: 'STRING' } },
          nextActions: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['summary', 'forecast', 'opportunities', 'risks', 'nextActions'],
      },
    },
  }
}

export function extractGeminiResponseText(payload: GeminiGenerateContentResponse) {
  return payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    ?.trim()
}
