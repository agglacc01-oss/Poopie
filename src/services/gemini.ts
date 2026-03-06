import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Quiz, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const quizSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
          },
          correctAnswer: { type: Type.INTEGER, description: "0-based index of the correct option (0-3)" },
          explanation: { type: Type.STRING }
        },
        required: ["text", "options", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["title", "questions"]
};

export async function generateQuiz(
  source: { text?: string; file?: { data: string; mimeType: string } },
  fileName: string,
  numQuestions: number,
  difficulty: Difficulty,
  isDirectImport: boolean = false
): Promise<Quiz> {
  console.log(`Generating quiz for ${fileName}...`, { numQuestions, difficulty, isDirectImport });

  const parts: any[] = [];
  
  if (source.file) {
    parts.push({
      inlineData: {
        data: source.file.data,
        mimeType: source.file.mimeType
      }
    });
  } else if (source.text) {
    parts.push({ text: `CONTENT TO PROCESS:\n${source.text}` });
  }

  const promptText = isDirectImport 
    ? `
    The provided content contains a list of questions and answers. 
    Your task is to EXTRACT these questions and answers and format them into the required JSON structure.
    
    Requirements:
    - Title: Create a descriptive title for this quiz based on the questions provided. DO NOT use "General Knowledge" unless it truly is.
    - Questions: Extract ALL questions provided in the content.
    - Options: Ensure each question has exactly 4 options. If the source only provides the correct answer, generate 3 plausible distractors.
    - Accuracy: The correctAnswer MUST be the 0-based index of the correct option in the options array.
    - Explanations: If explanations are missing in the source, generate helpful ones.
    - Format: Return the response in the specified JSON format.
    `
    : `
    Generate a comprehensive quiz based ONLY on the provided content from the file "${fileName}".
    
    IMPORTANT: 
    - If the provided content ALREADY contains questions and answers, your task is to extract them and format them into the required JSON structure. You may improve the clarity of the questions or add explanations if they are missing.
    - If the provided content is study material (text, document, etc.), generate up to ${numQuestions} high-quality questions that test deep understanding of the material.
    
    Requirements:
    - Title: Create a descriptive title for this quiz based on the content.
    - Number of questions: ${numQuestions} (Generate as many as possible up to this limit, but at least 5 if content allows).
    - Difficulty: ${difficulty}
    - Format: Multiple choice with exactly 4 distinct options per question.
    - Content: Ensure all questions are directly derived from the provided source.
    - Accuracy: The correctAnswer MUST be the 0-based index of the correct option in the options array.
    - Explanations: Provide a helpful explanation for why the answer is correct.
    
    If the content is too short to generate ${numQuestions} questions, generate as many high-quality ones as you can.
  `;

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema as any,
        temperature: 0.7,
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    const rawQuiz = JSON.parse(response.text);
    console.log("Successfully generated quiz data:", rawQuiz);
    
    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: rawQuiz.title || `Quiz: ${fileName}`,
      difficulty,
      createdAt: Date.now(),
      questions: (rawQuiz.questions || []).map((q: any) => ({
        ...q,
        id: crypto.randomUUID(),
        // Ensure correctAnswer is within bounds
        correctAnswer: Math.max(0, Math.min(3, q.correctAnswer || 0))
      }))
    };

    if (quiz.questions.length === 0) {
      throw new Error("No questions were generated from the content.");
    }

    return quiz;
  } catch (error) {
    console.error("Error in generateQuiz:", error);
    throw error;
  }
}
