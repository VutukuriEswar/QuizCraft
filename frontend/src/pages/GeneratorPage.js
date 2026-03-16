import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateQuiz } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft, Upload, Plus, Trash2, Sparkles, Loader2,
    CheckCircle, HelpCircle, Download, Copy, FileText,
    X, Eye, EyeOff, BookOpen, GraduationCap, Check, Printer
} from 'lucide-react';
import { toast } from 'sonner';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TYPE_LABELS = {
    mcq: 'Single Choice',
    msq: 'Multiple Choice',
    true_false: 'True / False',
};

const TYPE_COLORS = {
    mcq: 'from-violet-500 to-violet-600',
    msq: 'from-blue-500 to-blue-600',
    true_false: 'from-amber-500 to-amber-600',
};

function buildExportText(questions, meta, showAnswers) {
    const lines = [];
    if (meta.title) lines.push(`QUIZ: ${meta.title.toUpperCase()}`);
    if (meta.subject) lines.push(`Subject: ${meta.subject}`);
    lines.push(`Total Questions: ${questions.length}`);
    const totalMarks = questions.reduce((a, q) => a + (q.marks || 1), 0);
    lines.push(`Total Marks: ${totalMarks}`);
    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('');

    const groups = {};
    questions.forEach(q => {
        if (!groups[q.type]) groups[q.type] = [];
        groups[q.type].push(q);
    });

    let qNum = 1;
    const typeOrder = ['mcq', 'msq', 'true_false'];
    for (const t of typeOrder) {
        if (!groups[t]) continue;
        lines.push(`SECTION: ${TYPE_LABELS[t] || t.toUpperCase()}`);
        lines.push('─'.repeat(40));
        lines.push('');
        groups[t].forEach(q => {
            lines.push(`Q${qNum}. [${q.marks} mark${q.marks > 1 ? 's' : ''}] ${q.question_text}`);
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt, i) => {
                    const letter = OPTION_LETTERS[i] || String(i + 1);
                    lines.push(`    ${letter}) ${opt}`);
                });
            }
            if (showAnswers) {
                const ans = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
                lines.push(`    ✓ Answer: ${ans}`);
            }
            lines.push('');
            qNum++;
        });
        lines.push('');
    }

    if (showAnswers) {
        lines.push('═'.repeat(60));
        lines.push('ANSWER KEY');
        lines.push('─'.repeat(40));
        let n = 1;
        questions.forEach(q => {
            const ans = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
            lines.push(`Q${n}. ${ans}`);
            n++;
        });
    }

    return lines.join('\n');
}

function triggerPrint(questions, meta, showAnswers) {
    const text = buildExportText(questions, meta, showAnswers);
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>${meta.title || 'Quiz'}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
                h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
                .meta { color: #64748b; margin-bottom: 24px; }
                .section-title { font-weight: bold; font-size: 1.1em; margin-top: 28px; margin-bottom: 4px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                .question { margin: 16px 0 8px 0; font-weight: 600; }
                .option { margin: 4px 0 4px 24px; }
                .answer { color: #16a34a; margin: 6px 0 6px 24px; font-weight: 600; }
                .explanation { color: #92400e; margin: 2px 0 8px 24px; font-size: 0.9em; }
                .answer-key { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 16px; }
                @media print { body { margin: 20px; } }
            </style>
        </head>
        <body>
            ${renderPrintHtml(questions, meta, showAnswers)}
        </body>
        </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
}

function renderPrintHtml(questions, meta, showAnswers) {
    let html = '';
    if (meta.title) html += `<h1>${escapeHtml(meta.title)}</h1>`;
    html += `<div class="meta">`;
    if (meta.subject) html += `<strong>Subject:</strong> ${escapeHtml(meta.subject)} &nbsp;|&nbsp; `;
    const totalMarks = questions.reduce((a, q) => a + (q.marks || 1), 0);
    html += `<strong>Total:</strong> ${questions.length} questions, ${totalMarks} marks</div>`;

    const groups = {};
    questions.forEach(q => {
        if (!groups[q.type]) groups[q.type] = [];
        groups[q.type].push(q);
    });

    const typeOrder = ['mcq', 'msq', 'true_false'];
    let qNum = 1;
    for (const t of typeOrder) {
        if (!groups[t]) continue;
        html += `<div class="section-title">Section: ${TYPE_LABELS[t] || t}</div>`;
        groups[t].forEach(q => {
            html += `<div class="question">Q${qNum}. (${q.marks} mark${q.marks > 1 ? 's' : ''}) ${escapeHtml(q.question_text)}</div>`;
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt, i) => {
                    const letter = OPTION_LETTERS[i] || String(i + 1);
                    html += `<div class="option">${letter}) ${escapeHtml(opt)}</div>`;
                });
            }
            if (showAnswers) {
                const ans = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
                html += `<div class="answer">✓ Answer: ${escapeHtml(ans)}</div>`;
            }
            html += '<br/>';
            qNum++;
        });
    }

    if (showAnswers) {
        html += `<div class="answer-key"><h2>Answer Key</h2>`;
        let n = 1;
        questions.forEach(q => {
            const ans = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
            html += `<div><strong>Q${n}.</strong> ${escapeHtml(ans)}</div>`;
            n++;
        });
        html += '</div>';
    }
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const ExportModal = ({ questions, meta, onClose }) => {
    const [copied, setCopied] = useState(null);

    const handleCopy = (showAnswers) => {
        const text = buildExportText(questions, meta, showAnswers);
        navigator.clipboard.writeText(text).then(() => {
            setCopied(showAnswers ? 'with' : 'without');
            setTimeout(() => setCopied(null), 2000);
            toast.success('Copied to clipboard!');
        });
    };

    const handlePrint = (showAnswers) => {
        triggerPrint(questions, meta, showAnswers);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-violet-400" />
                        <h2 className="text-lg font-bold font-outfit text-white">Export Quiz</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-slate-400 text-sm">Choose how you want to export the quiz:</p>

                    <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-violet-300" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">With Answers</p>
                                <p className="text-xs text-slate-400">Includes correct answers</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                                onClick={() => handleCopy(true)}
                            >
                                {copied === 'with' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                Copy Text
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-violet-500/50 text-violet-300 hover:bg-violet-500/10"
                                onClick={() => handlePrint(true)}
                            >
                                <Printer className="w-4 h-4 mr-1" />
                                Print / PDF
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-cyan-300" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Without Answers</p>
                                <p className="text-xs text-slate-400">Questions &amp; options only — no answers</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                                onClick={() => handleCopy(false)}
                            >
                                {copied === 'without' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                Copy Text
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                                onClick={() => handlePrint(false)}
                            >
                                <Printer className="w-4 h-4 mr-1" />
                                Print / PDF
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                        Print opens in a new tab — use browser's Print dialog to save as PDF.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

const QuestionCard = ({ question, index, showAnswers }) => {
    const isCorrect = (opt) => {
        if (Array.isArray(question.answer)) return question.answer.includes(opt);
        return question.answer === opt;
    };

    const typeColor = TYPE_COLORS[question.type] || 'from-slate-500 to-slate-600';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="bg-slate-800/80 border-slate-700 shadow-lg hover:border-slate-600 transition-colors">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                {index + 1}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${typeColor} text-white text-xs font-bold shadow-sm`}>
                                {TYPE_LABELS[question.type] || question.type}
                            </span>
                        </div>
                        <span className="text-sm font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-lg">
                            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                        </span>
                    </div>

                    <p className="text-base font-medium text-white mb-4 leading-relaxed">
                        {question.question_text}
                    </p>
                    {question.options && question.options.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {question.options.map((opt, i) => {
                                const correct = isCorrect(opt);
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors
                                            ${showAnswers && correct
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-300'
                                            }`}
                                    >
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold
                                            ${showAnswers && correct
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-slate-600 text-slate-500'
                                            }`}>
                                            {OPTION_LETTERS[i] || i + 1}
                                        </span>
                                        <span className="flex-1 leading-relaxed">{opt}</span>
                                        {showAnswers && correct && (
                                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showAnswers && (
                        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                            {(!question.options || question.options.length === 0) && (
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Model Answer</p>
                                        <p className="text-sm text-emerald-300 leading-relaxed">{question.answer}</p>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const SkeletonCard = ({ index }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3"
    >
        <div className="flex justify-between">
            <div className="h-5 w-24 bg-slate-700 rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-slate-700 rounded-full animate-pulse" />
        </div>
        <div className="h-4 bg-slate-700 rounded animate-pulse w-full" />
        <div className="h-4 bg-slate-700 rounded animate-pulse w-5/6" />
        <div className="space-y-2 mt-2">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-slate-700/60 rounded-lg animate-pulse" />
            ))}
        </div>
    </motion.div>
);

const GeneratorPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showAnswers, setShowAnswers] = useState(true);
    const [showExportModal, setShowExportModal] = useState(false);
    const [quizMeta, setQuizMeta] = useState({ title: '', subject: '' });
    const [configBlocks, setConfigBlocks] = useState([
        { count: 5, marks: 1, type: 'mcq' },
        { count: 3, marks: 2, type: 'msq' },
    ]);

    const handleFileChange = useCallback((selectedFile) => {
        if (!selectedFile) return;
        const allowed = ['.pdf', '.docx', '.pptx', '.txt'];
        const ext = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error('Unsupported format. Use PDF, DOCX, PPTX, or TXT.');
            return;
        }
        setFile(selectedFile);
        toast.success(`📄 ${selectedFile.name} selected`);
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFileChange(f);
    }, [handleFileChange]);

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    const addBlock = () => setConfigBlocks([...configBlocks, { count: 3, marks: 1, type: 'mcq' }]);
    const removeBlock = (i) => setConfigBlocks(configBlocks.filter((_, idx) => idx !== i));
    const updateBlock = (i, key, value) => {
        const nb = [...configBlocks];
        nb[i][key] = value;
        setConfigBlocks(nb);
    };

    const handleGenerate = async () => {
        if (!text && !file) {
            toast.error('Please provide text or upload a file.');
            return;
        }
        if (configBlocks.length === 0) {
            toast.error('Add at least one question section.');
            return;
        }

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        if (file) formData.append('file', file);
        if (text) formData.append('text', text);
        formData.append('config', JSON.stringify(configBlocks));

        try {
            const response = await generateQuiz(formData);
            const data = response.data;
            if (!data.questions || data.questions.length === 0) {
                toast.error('No questions could be generated. Try adding more content.');
            } else {
                setResult(data);
                toast.success(`✅ ${data.questions.length} questions generated!`);
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Generation failed. Check your content and try again.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const totalMarks = result?.questions?.reduce((a, q) => a + (q.marks || 1), 0) || 0;
    const skeletonCount = configBlocks.reduce((a, b) => a + (b.count || 1), 0);

    return (
        <div className="min-h-screen text-slate-100 pb-24">
            <AnimatePresence>
                {showExportModal && result && (
                    <ExportModal
                        questions={result.questions}
                        meta={quizMeta}
                        onClose={() => setShowExportModal(false)}
                    />
                )}
            </AnimatePresence>

            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        <span className="font-bold font-outfit text-lg">Quiz Generator</span>
                    </div>
                    {result ? (
                        <Button
                            onClick={() => setShowExportModal(true)}
                            className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm"
                            size="sm"
                        >
                            <Download className="w-4 h-4 mr-1.5" /> Export
                        </Button>
                    ) : (
                        <div className="w-24" />
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid lg:grid-cols-2 gap-10">

                    <div className="space-y-6">

                        <Card className="glass border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white text-base">Quiz Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-slate-400 mb-1.5 block">Quiz Title</Label>
                                        <Input
                                            placeholder="e.g. Chapter 3 Test"
                                            value={quizMeta.title}
                                            onChange={e => setQuizMeta({ ...quizMeta, title: e.target.value })}
                                            className="h-9 bg-slate-900/50 border-slate-700 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-400 mb-1.5 block">Subject / Course</Label>
                                        <Input
                                            placeholder="e.g. Biology"
                                            value={quizMeta.subject}
                                            onChange={e => setQuizMeta({ ...quizMeta, subject: e.target.value })}
                                            className="h-9 bg-slate-900/50 border-slate-700 text-sm"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Source Material</CardTitle>
                                <CardDescription className="text-slate-400">Upload a document or paste your content below</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                                        ${isDragging
                                            ? 'border-violet-400 bg-violet-500/10 scale-[1.01]'
                                            : file
                                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                                : 'border-slate-700 hover:border-violet-500/60 bg-slate-800/20'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.pptx,.txt"
                                        onChange={e => handleFileChange(e.target.files[0])}
                                    />
                                    {file ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <FileText className="w-8 h-8 text-emerald-400" />
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-emerald-300">{file.name}</p>
                                                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="ml-2 text-slate-400 hover:text-red-400 w-8 h-8"
                                                onClick={e => { e.stopPropagation(); setFile(null); }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className={`w-10 h-10 mx-auto mb-2 ${isDragging ? 'text-violet-400' : 'text-slate-500'}`} />
                                            <p className="text-sm font-medium text-slate-300">
                                                Drop file here or <span className="text-violet-400">browse</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX, TXT — up to 32MB</p>
                                        </>
                                    )}
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700" /></div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-slate-800 px-2 text-slate-500">or paste text</span>
                                    </div>
                                </div>

                                <Textarea
                                    placeholder="Paste your lecture notes, textbook content, or any study material here..."
                                    className="min-h-[180px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 resize-y text-sm leading-relaxed"
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                                {text && (
                                    <p className="text-xs text-slate-500 text-right">
                                        {text.split(/\s+/).filter(Boolean).length} words
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="glass border-slate-700">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-white">Quiz Configuration</CardTitle>
                                        <CardDescription className="text-slate-400">Define sections, question types &amp; marks</CardDescription>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addBlock} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                        <Plus className="w-4 h-4 mr-1" /> Section
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <AnimatePresence>
                                    {configBlocks.map((block, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-12 gap-2 items-end bg-slate-800/50 p-3 rounded-xl border border-slate-700"
                                        >
                                            <div className="col-span-3 space-y-1">
                                                <Label className="text-xs text-slate-400">Count</Label>
                                                <Input
                                                    type="number" min="1" max="20"
                                                    value={block.count}
                                                    onChange={e => updateBlock(idx, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-9 bg-slate-900 border-slate-700 text-center text-sm"
                                                />
                                            </div>
                                            <div className="col-span-3 space-y-1">
                                                <Label className="text-xs text-slate-400">Marks</Label>
                                                <Input
                                                    type="number" min="1" max="100"
                                                    value={block.marks}
                                                    onChange={e => updateBlock(idx, 'marks', Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-9 bg-slate-900 border-slate-700 text-center text-sm"
                                                />
                                            </div>
                                            <div className="col-span-4 space-y-1">
                                                <Label className="text-xs text-slate-400">Type</Label>
                                                <Select
                                                    value={block.type}
                                                    onValueChange={val => updateBlock(idx, 'type', val)}
                                                >
                                                    <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-700">
                                                        <SelectItem value="mcq">Single Choice</SelectItem>
                                                        <SelectItem value="msq">Multiple Choice</SelectItem>
                                                        <SelectItem value="true_false">True / False</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-2 flex justify-center">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => removeBlock(idx)}
                                                    className="text-slate-500 hover:text-red-400 hover:bg-red-900/20 w-9 h-9"
                                                    disabled={configBlocks.length === 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                <div className="flex justify-between text-xs text-slate-400 pt-1 px-1">
                                    <span>{configBlocks.reduce((a, b) => a + (b.count || 0), 0)} questions total</span>
                                    <span>{configBlocks.reduce((a, b) => a + (b.count || 0) * (b.marks || 1), 0)} marks total</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            className="w-full h-13 bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white text-base shadow-xl shadow-violet-500/20 rounded-xl py-3"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading
                                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                                : <><Sparkles className="w-5 h-5 mr-2" /> Generate Quiz</>
                            }
                        </Button>
                    </div>

                    <div className="space-y-5">
                        {loading ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-6 w-40 bg-slate-700 rounded animate-pulse" />
                                </div>
                                {Array.from({ length: Math.min(skeletonCount, 4) }).map((_, i) => (
                                    <SkeletonCard key={i} index={i} />
                                ))}
                            </div>
                        ) : result ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-xl font-bold font-outfit text-white">
                                            {result.questions.length} Questions Generated
                                        </h3>
                                        <p className="text-sm text-slate-400">
                                            {totalMarks} marks total
                                            {quizMeta.subject && ` · ${quizMeta.subject}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-1.5"
                                            onClick={() => setShowAnswers(v => !v)}
                                        >
                                            {showAnswers
                                                ? <><EyeOff className="w-4 h-4" /> Hide Answers</>
                                                : <><Eye className="w-4 h-4" /> Show Answers</>
                                            }
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {result.questions.map((q, i) => (
                                        <QuestionCard
                                            key={i}
                                            question={q}
                                            index={i}
                                            showAnswers={showAnswers}
                                        />
                                    ))}
                                </div>

                                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">Ready to use!</p>
                                        <p className="text-xs text-slate-400">Export with or without answers</p>
                                    </div>
                                    <Button
                                        className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white"
                                        onClick={() => setShowExportModal(true)}
                                    >
                                        <Download className="w-4 h-4 mr-1.5" /> Export
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-700 rounded-2xl p-12 min-h-64">
                                <Sparkles className="w-12 h-12 text-violet-400/30 mb-4" />
                                <p className="text-slate-400 font-medium mb-1">Your quiz will appear here</p>
                                <p className="text-slate-600 text-sm">Add content and configure sections on the left, then click Generate Quiz.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GeneratorPage;