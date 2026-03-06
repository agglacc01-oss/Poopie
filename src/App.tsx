import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  BarChart3, 
  History, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Check,
  Calendar,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import mammoth from 'mammoth';
import { Difficulty, Quiz, Question, QuizResult, PerformanceData, SavedSession } from './types';
import { generateQuiz } from './services/gemini';
import { cn } from './lib/utils';

// --- Components ---

const Header = () => (
  <header className="w-full py-6 px-4 border-b border-zinc-200 bg-white sticky top-0 z-10">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <BarChart3 size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Learn<span className="text-indigo-600">MORE</span></h1>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
        <span className="hidden sm:inline">AI-Powered Learning</span>
      </div>
    </div>
  </header>
);

const PerformanceChart = ({ history }: { history: PerformanceData[] }) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="text-indigo-600" size={20} />
        <h3 className="text-lg font-bold text-zinc-900">Progression Curve</h3>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#71717a', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="correctCount" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCorrect)" 
              name="Correct Answers"
            />
            <Area 
              type="monotone" 
              dataKey="totalSolved" 
              stroke="#e4e4e7" 
              strokeWidth={2}
              fill="transparent"
              name="Total Questions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-600" />
          Correct
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-200" />
          Total
        </div>
      </div>
    </div>
  );
};

const FileUploader = ({ onFileProcessed, onPasteContent }: { 
  onFileProcessed: (content: string, name: string, isDirectImport?: boolean, filePart?: { data: string, mimeType: string }) => void,
  onPasteContent: (content: string, isDirectImport: boolean) => void
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [isDirectImportFile, setIsDirectImportFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          onFileProcessed("", file.name, isDirectImportFile, { data: base64, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value.trim()) throw new Error("The Word document appears to be empty.");
        onFileProcessed(result.value, file.name, isDirectImportFile);
      } else {
        const text = await file.text();
        if (!text.trim()) throw new Error("The file appears to be empty.");
        onFileProcessed(text, file.name, isDirectImportFile);
      }
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || "Failed to process file. Please try another format.");
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex bg-zinc-100 p-1 rounded-2xl w-fit mx-auto mb-4">
        <button 
          onClick={() => setShowPaste(false)}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all",
            !showPaste ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          Upload File
        </button>
        <button 
          onClick={() => setShowPaste(true)}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all",
            showPaste ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          Paste Text
        </button>
      </div>

      {!showPaste ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group",
            isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-zinc-200 hover:border-indigo-400 hover:bg-zinc-50"
          )}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.docx,.txt,.md,.pptx"
          />
          
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110",
            isProcessing ? "bg-zinc-100" : "bg-indigo-100 text-indigo-600"
          )}>
            {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
          </div>
          
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">
            {isProcessing ? "Processing your file..." : "Upload study material"}
          </h3>
          <p className="text-zinc-500 text-center max-w-sm text-sm mb-6">
            PDF, Word, or Text. AI will generate questions based on the content.
          </p>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-3 bg-white border border-zinc-200 px-4 py-3 rounded-2xl hover:border-indigo-200 transition-colors"
          >
            <input 
              type="checkbox" 
              id="direct-import-file"
              checked={isDirectImportFile}
              onChange={(e) => setIsDirectImportFile(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="direct-import-file" className="text-sm font-medium text-zinc-700 cursor-pointer select-none">
              This file already contains questions and answers
            </label>
          </div>
          
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your study material or existing questions and answers here..."
            className="w-full h-48 p-4 rounded-2xl border border-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none text-zinc-700 mb-6"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              disabled={!pasteText.trim()}
              onClick={() => onPasteContent(pasteText, false)}
              className={cn(
                "py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                pasteText.trim() 
                  ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200" 
                  : "bg-zinc-50 text-zinc-300 cursor-not-allowed"
              )}
            >
              Generate from Content
            </button>
            <button
              disabled={!pasteText.trim()}
              onClick={() => onPasteContent(pasteText, true)}
              className={cn(
                "py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                pasteText.trim() 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100" 
                  : "bg-indigo-100 text-indigo-300 cursor-not-allowed"
              )}
            >
              Import Questions & Answers
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const QuizConfig = ({ 
  onStart, 
  onBack,
  fileName 
}: { 
  onStart: (count: number, difficulty: Difficulty) => void,
  onBack: () => void,
  fileName: string
}) => {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);

  const counts = [10, 25, 50, 100];
  const difficulties = Object.values(Difficulty);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 px-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to dashboard
      </button>

      <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Configure your Quiz</h2>
            <p className="text-sm text-zinc-500">Based on: {fileName}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <label className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 block">
              Number of Questions
            </label>
            <div className="grid grid-cols-4 gap-3">
              {counts.map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={cn(
                    "py-3 rounded-xl font-medium transition-all border",
                    count === c 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300"
                  )}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => setCount(101)}
                className={cn(
                  "py-3 rounded-xl font-medium transition-all border",
                  count > 100 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300"
                )}
              >
                100+
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 block">
              Difficulty Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {difficulties.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "py-3 rounded-xl font-medium transition-all border",
                    difficulty === d 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart(count, difficulty)}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
          >
            Generate Quiz
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuizForm = ({ 
  quiz, 
  onSubmit 
}: { 
  quiz: Quiz, 
  onSubmit: (answers: Record<string, number>) => void 
}) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const isComplete = Object.keys(answers).length === quiz.questions.length;

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 px-4 pb-24">
      <div className="mb-8">
        <div className="h-2 w-full bg-indigo-600 rounded-t-lg" />
        <div className="bg-white p-8 rounded-b-3xl border border-zinc-200 border-t-0 shadow-sm">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">{quiz.title}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span className="bg-zinc-100 px-3 py-1 rounded-full font-medium">{quiz.difficulty}</span>
            <span>{quiz.questions.length} Questions</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={q.id} 
            className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm"
          >
            <p className="text-lg font-medium text-zinc-900 mb-6">
              <span className="text-indigo-600 mr-2">{idx + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-3">
              {q.options.map((opt, optIdx) => (
                <label 
                  key={optIdx}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                    answers[q.id] === optIdx 
                      ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600" 
                      : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <input 
                    type="radio" 
                    name={q.id} 
                    className="w-5 h-5 text-indigo-600 border-zinc-300 focus:ring-indigo-600"
                    onChange={() => handleSelect(q.id, optIdx)}
                    checked={answers[q.id] === optIdx}
                  />
                  <span className="text-zinc-700">{opt}</span>
                </label>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-8 left-0 right-0 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            disabled={!isComplete}
            onClick={() => onSubmit(answers)}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2",
              isComplete 
                ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            )}
          >
            Submit Answers
            {isComplete && <Check size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

const ResultView = ({ 
  quiz, 
  result, 
  onReset 
}: { 
  quiz: Quiz, 
  result: QuizResult, 
  onReset: () => void
}) => {
  const [showScore, setShowScore] = useState(false);
  const scorePercentage = Math.round((result.score / result.totalQuestions) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4 pb-24">
      {!showScore ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-zinc-200 shadow-sm">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">Quiz Submitted!</h2>
          <p className="text-zinc-500 mb-8">Your answers have been recorded.</p>
          <button
            onClick={() => setShowScore(true)}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            View Score
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Score Header */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-black text-zinc-900 mb-2">{scorePercentage}%</h2>
              <p className="text-zinc-500 font-medium">
                You got {result.score} out of {result.totalQuestions} correct
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onReset}
                className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Detailed Review */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-900 px-2">Review Answers</h3>
            {quiz.questions.map((q, idx) => {
              const userAnswer = result.answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              
              return (
                <div key={q.id} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <p className="text-lg font-medium text-zinc-900">
                      <span className="text-zinc-400 mr-2">{idx + 1}.</span>
                      {q.text}
                    </p>
                    {isCorrect ? (
                      <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">
                        <CheckCircle2 size={16} />
                        Correct
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-bold">
                        <XCircle size={16} />
                        Incorrect
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = userAnswer === optIdx;
                      const isCorrectOpt = q.correctAnswer === optIdx;
                      
                      return (
                        <div 
                          key={optIdx}
                          className={cn(
                            "p-4 rounded-2xl border flex items-center justify-between",
                            isCorrectOpt ? "border-green-200 bg-green-50/30" : 
                            isSelected ? "border-red-200 bg-red-50/30" : "border-zinc-50"
                          )}
                        >
                          <span className={cn(
                            "text-zinc-700",
                            isCorrectOpt && "text-green-700 font-medium",
                            isSelected && !isCorrectOpt && "text-red-700"
                          )}>
                            {opt}
                          </span>
                          {isCorrectOpt && <CheckCircle2 size={18} className="text-green-600" />}
                          {isSelected && !isCorrectOpt && <XCircle size={18} className="text-red-600" />}
                        </div>
                      );
                    })}
                  </div>

                  {!isCorrect && (
                    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                      <p className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertCircle size={14} className="text-indigo-600" />
                        Explanation
                      </p>
                      <p className="text-zinc-600 text-sm leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'upload' | 'config' | 'loading' | 'quiz' | 'result'>('upload');
  const [fileData, setFileData] = useState<{ content: string, name: string, filePart?: { data: string, mimeType: string } } | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [history, setHistory] = useState<PerformanceData[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('learnmore_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    const savedSessions = localStorage.getItem('learnmore_sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  const handleFileProcessed = (content: string, name: string, isDirectImport: boolean = false, filePart?: { data: string, mimeType: string }) => {
    const newFileData = { content, name, filePart };
    setFileData(newFileData);
    if (isDirectImport) {
      handleStartQuiz(10, Difficulty.MEDIUM, true, content, filePart, name);
    } else {
      setStep('config');
    }
  };

  const handleStartQuiz = async (
    count: number, 
    difficulty: Difficulty, 
    isDirectImport: boolean = false, 
    directContent?: string,
    directFilePart?: { data: string, mimeType: string },
    directName?: string
  ) => {
    const activeContent = directContent !== undefined ? directContent : fileData?.content;
    const activeFilePart = directFilePart || fileData?.filePart;
    const activeName = directName || fileData?.name || "Imported Questions";

    if (!activeContent && !activeFilePart) return;
    
    setStep('loading');
    setIsGenerating(true);
    try {
      const source = activeFilePart 
        ? { file: activeFilePart } 
        : { text: activeContent };
        
      const generatedQuiz = await generateQuiz(source, activeName, count, difficulty, isDirectImport);
      setQuiz(generatedQuiz);
      setStep('quiz');
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to generate quiz. Please try again with different content or settings.");
      setStep(isDirectImport ? 'upload' : 'config');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizSubmit = (answers: Record<string, number>) => {
    if (!quiz) return;
    
    let score = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });

    const quizResult: QuizResult = {
      quizId: quiz.id,
      score,
      totalQuestions: quiz.questions.length,
      answers,
      date: Date.now()
    };

    const newPerformance: PerformanceData = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalSolved: quiz.questions.length,
      correctCount: score
    };

    const updatedHistory = [...history, newPerformance].slice(-10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('learnmore_history', JSON.stringify(updatedHistory));

    // Save Session
    const newSession: SavedSession = {
      id: crypto.randomUUID(),
      quiz,
      result: quizResult,
      timestamp: Date.now()
    };
    const updatedSessions = [newSession, ...sessions].slice(0, 20); // Keep last 20
    setSessions(updatedSessions);
    localStorage.setItem('learnmore_sessions', JSON.stringify(updatedSessions));
    
    setResult(quizResult);
    setStep('result');
  };

  const handleViewSession = (session: SavedSession) => {
    setQuiz(session.quiz);
    setResult(session.result);
    setStep('result');
  };

  const handleReset = () => {
    setStep('upload');
    setFileData(null);
    setQuiz(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <Header />
      
      <main className="container mx-auto pb-20">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-6xl mx-auto px-4"
            >
              <div className="text-center mt-16 mb-12">
                <h2 className="text-5xl font-black tracking-tight text-zinc-900 mb-4">
                  Learn <span className="text-indigo-600 italic">Faster</span>.
                </h2>
                <p className="text-lg text-zinc-500 max-w-xl mx-auto">
                  Upload your documents and let AI create the perfect quiz to test your knowledge.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Upload & History */}
                <div className="lg:col-span-2 space-y-8">
                  <FileUploader 
                    onFileProcessed={handleFileProcessed} 
                    onPasteContent={(content, isDirectImport) => handleFileProcessed(content, "Pasted Content", isDirectImport)}
                  />
                  
                  {sessions.length > 0 && (
                    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="text-indigo-600" size={20} />
                          <h3 className="text-lg font-bold text-zinc-900">Past Quizzes</h3>
                        </div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{sessions.length} Saved</span>
                      </div>
                      <div className="divide-y divide-zinc-50 max-h-[400px] overflow-y-auto">
                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => handleViewSession(session)}
                            className="w-full p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors group text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <BookOpen size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-zinc-900 line-clamp-1">{session.quiz.title}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(session.timestamp).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                    {Math.round((session.result.score / session.result.totalQuestions) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="text-zinc-300 group-hover:text-indigo-600 transition-colors" size={20} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Performance Curve */}
                <div className="space-y-8">
                  <PerformanceChart history={history} />
                  
                  {history.length > 0 && (
                    <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
                      <h3 className="text-xl font-bold mb-2">Keep it up!</h3>
                      <p className="text-indigo-100 text-sm mb-6">You've solved {history.reduce((acc, curr) => acc + curr.totalSolved, 0)} questions so far.</p>
                      <div className="flex items-center justify-between bg-white/10 rounded-2xl p-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Avg. Score</p>
                          <p className="text-2xl font-black">
                            {Math.round((history.reduce((acc, curr) => acc + curr.correctCount, 0) / history.reduce((acc, curr) => acc + curr.totalSolved, 0)) * 100)}%
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={24} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'config' && fileData && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <QuizConfig 
                fileName={fileData.name} 
                onStart={handleStartQuiz} 
                onBack={() => setStep('upload')}
              />
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="text-indigo-600 animate-pulse" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mt-8 mb-2">Generating your quiz...</h2>
              <p className="text-zinc-500 text-center max-w-md px-4">
                AI is analyzing your content to create relevant questions. This may take up to a minute for larger files.
              </p>
            </motion.div>
          )}

          {step === 'quiz' && quiz && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <QuizForm quiz={quiz} onSubmit={handleQuizSubmit} />
            </motion.div>
          )}

          {step === 'result' && quiz && result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ResultView 
                quiz={quiz} 
                result={result} 
                onReset={handleReset} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
