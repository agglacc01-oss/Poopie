export enum Difficulty {
  EASY = "Easy",
  MEDIUM = "Medium",
  DIFFICULT = "Difficult",
  MIXED = "Mixed"
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  difficulty: Difficulty;
  createdAt: number;
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  date: number;
}

export interface PerformanceData {
  date: string;
  totalSolved: number;
  correctCount: number;
}

export interface SavedSession {
  id: string;
  quiz: Quiz;
  result: QuizResult;
  timestamp: number;
}
