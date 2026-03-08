import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Sparkles, ArrowRight, FileText, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen text-slate-100 overflow-hidden relative">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />

            <header className="relative z-50 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold font-outfit tracking-tight">QuizCraft</span>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <Button onClick={() => navigate('/generate')} className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20">
                            Launch App <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </motion.div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm font-medium text-violet-300 mb-8">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered Academic Assistant
                    </div>

                    <h1 className="text-5xl md:text-7xl font-outfit font-black tracking-tight mb-6 leading-tight">
                        Create Quizzes from<br />
                        <span className="text-gradient">Any Document</span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Upload PDFs, PPTs, or Text. Define your weightage. Get theoretical, single-choice, or multi-choice questions with answers and explanations instantly.
                    </p>

                    <Button
                        size="lg"
                        onClick={() => navigate('/generate')}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white text-lg px-10 h-14 shadow-xl shadow-violet-500/20 rounded-xl"
                    >
                        Start Creating <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </motion.div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 mt-24">
                    {[
                        { icon: FileText, title: "Multi-Format Input", description: "Supports PDF, DOCX, PPTX, and plain text inputs.", color: "text-violet-400" },
                        { icon: Settings, title: "Custom Weightage", description: "Define marks and question types exactly as needed.", color: "text-cyan-400" },
                        { icon: Zap, title: "Instant & Smart", description: "Generates answers and context explanations instantly.", color: "text-amber-400" },
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="glass p-8 rounded-2xl text-left hover:border-violet-500/50 transition-colors"
                        >
                            <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                            <h3 className="text-xl font-bold mb-2 font-outfit">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default LandingPage;