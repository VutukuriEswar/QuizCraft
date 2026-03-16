import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Sparkles, ArrowRight, FileText, Download, GraduationCap, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
    {
        icon: FileText,
        title: 'Multi-Format Input',
        description: 'Upload PDFs, DOCX, PPTX, or paste plain text — the engine handles it all.',
        color: 'text-violet-400',
        bg: 'bg-violet-400/10',
    },
    {
        icon: GraduationCap,
        title: 'Professor-Grade Questions',
        description: 'Generates real conceptual questions — MCQs, True/False, Short Answer — not just blanked-out sentences.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
    },
    {
        icon: Download,
        title: 'Dual Export',
        description: 'Export with answers for professors or without for students. Print-ready PDF in one click.',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
    },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Add Content', desc: 'Upload a document or paste lecture notes' },
    { step: '02', title: 'Configure Quiz', desc: 'Set question types, count, and marks per section' },
    { step: '03', title: 'Generate', desc: 'NLP engine understands context and creates real questions' },
    { step: '04', title: 'Export', desc: 'Download professor or student versions instantly' },
];

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen text-slate-100 overflow-hidden relative">
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

            <header className="relative z-50 px-6 py-5 border-b border-slate-800/60">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold font-outfit tracking-tight">QuizCraft</span>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <Button
                            onClick={() => navigate('/generate')}
                            className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                        >
                            Launch App <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </motion.div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-violet-500/30 text-sm font-medium text-violet-300 mb-8">
                        <Sparkles className="w-4 h-4" />
                        NLP-Powered Academic Quiz Generator
                    </div>

                    <h1 className="text-5xl md:text-7xl font-outfit font-black tracking-tight mb-6 leading-tight">
                        Exam-Ready Quizzes from<br />
                        <span className="text-gradient">Any Document</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 mb-4 max-w-2xl mx-auto leading-relaxed">
                        Upload PDFs, PPTs, or text. Get conceptual MCQs, True/False, and Short-Answer questions that read
                        like a real professor wrote them — complete with answers and dual export.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-10 text-sm text-slate-400">
                        {['For Professors', 'For Students', '100% Free', 'No AI APIs'].map(t => (
                            <span key={t} className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                {t}
                            </span>
                        ))}
                    </div>

                    <Button
                        size="lg"
                        onClick={() => navigate('/generate')}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white text-lg px-10 h-14 shadow-xl shadow-violet-500/20 rounded-xl"
                    >
                        Start Creating <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6 mt-24 text-left">
                    {FEATURES.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="glass p-8 rounded-2xl hover:border-violet-500/50 transition-colors"
                        >
                            <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5`}>
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 font-outfit">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-24">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-12"
                    >
                        <h2 className="text-3xl md:text-4xl font-outfit font-bold mb-3">How It Works</h2>
                        <p className="text-slate-400">Four simple steps to a professional quiz</p>
                    </motion.div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
                        {HOW_IT_WORKS.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="relative"
                            >
                                <div className="text-5xl font-black font-outfit text-violet-500/20 mb-3">{item.step}</div>
                                <h4 className="font-bold text-white mb-1">{item.title}</h4>
                                <p className="text-slate-400 text-sm">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-24 glass rounded-2xl p-10 text-center"
                >
                    <BookOpen className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-outfit font-bold mb-3">Ready to generate your quiz?</h2>
                    <p className="text-slate-400 mb-6">Paste your content and have a complete quiz in seconds.</p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/generate')}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white px-8 h-12 rounded-xl"
                    >
                        Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </motion.div>
            </main>
        </div>
    );
};

export default LandingPage;