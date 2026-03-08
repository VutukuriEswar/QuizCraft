import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Plus, BookOpen, LogOut, User, Loader2, FileText, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { addModule, getModules } from '@/utils/api';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { user, isGuest, logout } = useAuth();
    const [myModules, setMyModules] = useState([]);
    const [loadingModules, setLoadingModules] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [savingModule, setSavingModule] = useState(false);
    const [moduleForm, setModuleForm] = useState({ module_id: '', module_name: '', module_content: '' });

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        setLoadingModules(true);
        try {
            const response = await getModules();
            setMyModules(response.data.modules);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingModules(false);
        }
    };

    const handleAddModule = async () => {
        if (!moduleForm.module_id || !moduleForm.module_name || !moduleForm.module_content) {
            toast.error("Please fill all fields");
            return;
        }
        setSavingModule(true);
        try {
            await addModule({
                module_id: parseInt(moduleForm.module_id),
                module_name: moduleForm.module_name,
                module_content: moduleForm.module_content
            });
            toast.success("Module added!");
            setShowAddModal(false);
            setModuleForm({ module_id: '', module_name: '', module_content: '' });
            fetchModules();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add module");
        } finally {
            setSavingModule(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold font-outfit">QuizCraft</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isGuest() && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                                    <User className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                                </div>
                                <span className="font-medium hidden sm:block">{user?.name}</span>
                            </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500">
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                    <h1 className="text-4xl font-outfit font-bold mb-2">Study Hub</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your modules and create new quizzes</p>
                </motion.div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-16">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
                        <Card className="h-full bg-gradient-to-br from-violet-600 to-purple-700 text-white border-0 shadow-xl shadow-violet-500/20 cursor-pointer overflow-hidden relative" onClick={() => setShowAddModal(true)}>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                        <Plus className="w-7 h-7" />
                                    </div>
                                    <FileText className="w-10 h-10 opacity-20 absolute right-4 top-4" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">New Module</h3>
                                <p className="text-violet-200 opacity-90">Upload lecture notes or course content</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
                        <Card className="h-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-lg cursor-pointer hover:border-violet-500 transition-colors" onClick={() => navigate('/quiz/setup')}>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                                        <Sparkles className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Generate Quiz</h3>
                                <p className="text-slate-500 dark:text-slate-400">Create a test from your modules</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Modules List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-outfit font-bold">My Modules</h2>
                    </div>

                    {loadingModules ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500 w-8 h-8" /></div>
                    ) : (
                        <motion.div layout className="grid gap-4">
                            <AnimatePresence>
                                {myModules.length === 0 ? (
                                    <Card className="border-dashed border-2 bg-transparent">
                                        <CardContent className="py-12 text-center text-slate-500">
                                            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p>No modules yet. Add your first one to get started!</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    myModules.map((mod, idx) => (
                                        <motion.div
                                            key={mod.module_id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-500 transition-colors cursor-pointer group">
                                                <CardContent className="p-5 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 transition-colors">
                                                        <BookOpen className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-violet-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold">{mod.module_name}</h3>
                                                        <p className="text-sm text-slate-500">ID: {mod.module_id}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Add Module Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold font-outfit">Add New Module</h2>
                                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></Button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Module ID</Label>
                                        <Input type="number" placeholder="1" value={moduleForm.module_id} onChange={(e) => setModuleForm({ ...moduleForm, module_id: e.target.value })} className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Module Name</Label>
                                        <Input placeholder="e.g. Python Basics" value={moduleForm.module_name} onChange={(e) => setModuleForm({ ...moduleForm, module_name: e.target.value })} className="h-12" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Content / Notes</Label>
                                    <Textarea rows={6} placeholder="Paste your study material here..." value={moduleForm.module_content} onChange={(e) => setModuleForm({ ...moduleForm, module_content: e.target.value })} className="resize-none text-sm" />
                                </div>
                                <Button className="w-full h-12 bg-violet-600 hover:bg-violet-700" onClick={handleAddModule} disabled={savingModule}>
                                    {savingting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Save Module
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardPage;