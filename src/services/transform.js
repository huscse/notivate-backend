import OpenAI from 'openai';
import config from '../config/env.js';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

/**
 * Strips markdown code block wrappers if GPT returns them
 * e.g. ```json { ... } ``` → { ... }
 */
function cleanJsonResponse(text) {
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ``` wrapper
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  return cleaned.trim();
}

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
  "diagrams": [
    {
      "type": "flowchart or mindmap or timeline or sequence",
      "title": "Clear diagram title",
      "mermaidCode": "Valid Mermaid.js syntax (see examples below)"
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
- Generate 1-2 diagrams using VALID Mermaid.js syntax to visualize the content
- Make the content clear and easy to understand
- Fix any OCR errors or garbled text
- If the text is too garbled to understand, do your best and note any uncertain parts

DIAGRAM EXAMPLES (Choose the type that best fits the content):

FLOWCHART (for processes, steps, decisions):
graph TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Step 1]
    B -->|No| D[Step 2]
    C --> E[End]
    D --> E

MINDMAP (for concepts, hierarchies, relationships):
mindmap
  root((Central Concept))
    Topic 1
      Subtopic A
      Subtopic B
    Topic 2
      Subtopic C
      Subtopic D

TIMELINE (for chronological events, history):
timeline
    title Event Timeline
    2020 : Event 1 : Details
    2021 : Event 2 : Details
    2022 : Event 3 : Details

SEQUENCE (for interactions, processes with actors):
sequenceDiagram
    participant A as Person 1
    participant B as Person 2
    A->>B: Action 1
    B->>A: Response
    A->>B: Action 2

IMPORTANT: 
- Use actual \\n for newlines in mermaidCode, not literal newlines
- Keep node labels SHORT (under 20 chars)
- Use simple, clear relationships
- Test that your Mermaid syntax is valid
- If content doesn't fit a diagram well, it's okay to skip diagrams array entirely`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2500, // Increased to accommodate diagrams
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;

    // Clean any markdown wrapper just in case, then parse
    const cleaned = cleanJsonResponse(content);
    const studyGuide = JSON.parse(cleaned);
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
