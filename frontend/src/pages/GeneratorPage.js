import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { generateQuiz } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Plus, Trash2, Sparkles, Loader2, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const GeneratorPage = () => {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [configBlocks, setConfigBlocks] = useState([{ count: 5, marks: 1, type: 'mcq' }]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            toast.success(`File selected: ${selectedFile.name}`);
        }
    };

    const addBlock = () => {
        setConfigBlocks([...configBlocks, { count: 5, marks: 1, type: 'mcq' }]);
    };

    const removeBlock = (index) => {
        const newBlocks = [...configBlocks];
        newBlocks.splice(index, 1);
        setConfigBlocks(newBlocks);
    };

    const updateBlock = (index, key, value) => {
        const newBlocks = [...configBlocks];
        newBlocks[index][key] = value;
        setConfigBlocks(newBlocks);
    };

    const handleGenerate = async () => {
        if (!text && !file) {
            toast.error("Please provide text or upload a file");
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
            setResult(response.data);
            toast.success("Quiz generated successfully!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Generation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-slate-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-400" />
                        <span className="font-bold font-outfit">Quiz Generator</span>
                    </div>
                    <div className="w-20" />
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="grid lg:grid-cols-2 gap-10">
                    {/* Left Column: Input */}
                    <div className="space-y-8">
                        <Card className="glass border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white">Source Material</CardTitle>
                                <CardDescription className="text-slate-400">Upload a file or paste text content</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-violet-500 transition-colors cursor-pointer bg-slate-800/20">
                                    <Input type="file" className="hidden" id="file-upload" onChange={handleFileChange} accept=".pdf,.docx,.pptx,.txt" />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">
                                            {file ? file.name : "Click to upload PDF, DOCX, PPTX"}
                                        </p>
                                    </label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700" /></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
                                </div>
                                <Textarea
                                    placeholder="Paste your course content here..."
                                    className="min-h-[150px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </CardContent>
                        </Card>

                        {/* Question Configuration */}
                        <Card className="glass border-slate-700">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-white">Quiz Configuration</CardTitle>
                                        <CardDescription className="text-slate-400">Define sections, marks, and types</CardDescription>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addBlock} className="border-slate-600 text-slate-300">
                                        <Plus className="w-4 h-4 mr-1" /> Section
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AnimatePresence>
                                    {configBlocks.map((block, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-12 gap-2 items-end bg-slate-800/50 p-3 rounded-lg border border-slate-700"
                                        >
                                            <div className="col-span-3 space-y-1">
                                                <Label className="text-xs text-slate-400">Count</Label>
                                                <Input type="number" value={block.count} onChange={(e) => updateBlock(idx, 'count', parseInt(e.target.value))} className="h-9 bg-slate-900 border-slate-700" />
                                            </div>
                                            <div className="col-span-3 space-y-1">
                                                <Label className="text-xs text-slate-400">Marks</Label>
                                                <Input type="number" value={block.marks} onChange={(e) => updateBlock(idx, 'marks', parseInt(e.target.value))} className="h-9 bg-slate-900 border-slate-700" />
                                            </div>
                                            <div className="col-span-4 space-y-1">
                                                <Label className="text-xs text-slate-400">Type</Label>
                                                <Select value={block.type} onValueChange={(val) => updateBlock(idx, 'type', val)}>
                                                    <SelectTrigger className="h-9 bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-slate-700">
                                                        <SelectItem value="mcq">Single Choice</SelectItem>
                                                        <SelectItem value="msq">Multi Choice</SelectItem>
                                                        <SelectItem value="theoretical">Theoretical</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-2">
                                                <Button variant="ghost" size="icon" onClick={() => removeBlock(idx)} className="text-red-400 hover:bg-red-900/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </CardContent>
                        </Card>

                        <Button className="w-full h-12 bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg" onClick={handleGenerate} disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                            Generate Quiz
                        </Button>
                    </div>

                    {/* Right Column: Output */}
                    <div className="space-y-6">
                        {result ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold font-outfit text-white">Generated Questions</h3>
                                    <Button variant="outline" size="sm" className="text-slate-400 border-slate-700" onClick={() => window.print()}>Export</Button>
                                </div>
                                <div className="space-y-6">
                                    {result.questions.map((q, idx) => (
                                        <Card key={idx} className="bg-slate-800 border-slate-700 shadow-lg">
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs font-bold uppercase">{q.type}</span>
                                                    <span className="text-sm font-bold text-cyan-400">{q.marks} Marks</span>
                                                </div>
                                                <p className="text-lg font-medium text-white mb-4">{idx + 1}. {q.question_text}</p>

                                                {q.options && (
                                                    <div className="space-y-2 mb-4">
                                                        {q.options.map((opt, i) => (
                                                            <div key={i} className={`p-3 rounded-lg border text-sm ${Array.isArray(q.answer)
                                                                    ? q.answer.includes(opt) ? 'bg-green-500/10 border-green-500 text-green-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'
                                                                    : q.answer === opt ? 'bg-green-500/10 border-green-500 text-green-300' : 'bg-slate-800/50 border-slate-700 text-slate-300'
                                                                }`}>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="mt-4 pt-4 border-t border-slate-700">
                                                    <div className="flex items-start gap-2">
                                                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-green-300">Answer: {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p>
                                                        </div>
                                                    </div>

                                                    {q.explanation && (
                                                        <div className="flex items-start gap-2 mt-3">
                                                            <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-amber-300 text-sm">{q.explanation}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center border border-dashed border-slate-700 rounded-xl p-10 mt-10">
                                <div className="text-slate-500">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Your generated questions will appear here</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GeneratorPage;