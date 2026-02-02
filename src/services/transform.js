import OpenAI from 'openai';
import config from '../config/env.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

/**
 * Transforms raw OCR text into a structured study guide using GPT-4
 * @param {string} rawText - The raw text extracted from the notes image
 * @returns {object} A structured study guide object
 */
async function transformNotes(rawText) {
  try {
    const prompt = `You are an expert note-taking assistant. A student has uploaded a photo of their messy lecture notes. The OCR extracted the following raw text:

---
${rawText}
---

Transform this into a beautifully structured study guide. Return ONLY a valid JSON object with this exact structure (no extra text, no markdown, just raw JSON):

{
  "title": "A clear, descriptive title for this set of notes",
  "subject": "The subject or topic area (e.g. Biology, Physics, History)",
  "summary": "A 2-3 sentence summary of what these notes cover",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed explanation of this section in clear, well-written prose",
      "keyTerms": ["term1", "term2"],
      "bullets": ["Key point 1", "Key point 2"]
    }
  ],
  "diagramSuggestions": [
    {
      "type": "flowchart or comparison or timeline",
      "description": "What this diagram should show and why it helps understanding"
    }
  ],
  "quizQuestions": [
    {
      "question": "A study question",
      "answer": "The answer to the question",
      "difficulty": "easy or medium or hard"
    }
  ]
}

Guidelines:
- Create 2-4 sections based on the content
- Extract 3-5 quiz questions at varying difficulty levels
- Suggest 1-2 diagrams that would help visualize the content
- Make the content clear and easy to understand
- Fix any OCR errors or garbled text
- If the text is too garbled to understand, do your best and note any uncertain parts`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;

    // Parse the JSON response
    const studyGuide = JSON.parse(content);
    return studyGuide;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Failed to parse GPT-4 response as JSON:', error.message);
      throw new Error(
        'AI returned an invalid response format. Please try again.',
      );
    }
    console.error('Transform Error:', error.message);
    throw new Error(`Failed to transform notes: ${error.message}`);
  }
}

export default { transformNotes };
