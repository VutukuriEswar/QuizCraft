import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
});

export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export const generateQuiz = (formData) =>
    api.post('/generate-quiz', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const saveQuiz = (data) => api.post('/save-quiz', data);

export const getModules = () => api.get('/modules');

export const addModule = (data) => api.post('/modules', data);