import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New candidate registered: Priya Sharma', time: '2 min ago', read: false, type: 'info' },
    { id: 2, message: 'High risk alert: Tab switch detected for Rahul Verma', time: '8 min ago', read: false, type: 'alert' },
    { id: 3, message: 'Exam "Java Backend Assessment" completed by 24 candidates', time: '1 hr ago', read: false, type: 'success' },
    { id: 4, message: 'Multiple faces detected: Anil Kumar', time: '3 hr ago', read: true, type: 'alert' },
  ]);

  const [exams, setExams] = useState([
    { id: 1, name: 'Java Backend Assessment', type: 'Skill Assessment', candidates: 45, status: 'Active', createdDate: '2024-01-15', duration: 90, languages: ['Java', 'SQL'], org: 'TechCorp India' },
    { id: 2, name: 'Python Data Science Test', type: 'Placement Assessment', candidates: 120, status: 'Completed', createdDate: '2024-01-10', duration: 120, languages: ['Python'], org: 'DataMind Labs' },
    { id: 3, name: 'Full Stack Developer Cert', type: 'Certification Exam', candidates: 30, status: 'Draft', createdDate: '2024-01-20', duration: 180, languages: ['Python', 'Java', 'SQL'], org: 'SkillBridge' },
    { id: 4, name: 'SQL Database Fundamentals', type: 'Skill Assessment', candidates: 67, status: 'Active', createdDate: '2024-01-18', duration: 60, languages: ['SQL'], org: 'Analytics Hub' },
    { id: 5, name: 'C++ Systems Programming', type: 'Certification Exam', candidates: 18, status: 'Completed', createdDate: '2024-01-05', duration: 150, languages: ['C++'], org: 'SysTech' },
  ]);

  const [questions, setQuestions] = useState([
    { id: 'Q001', type: 'MCQ', difficulty: 'Easy', topic: 'Java Basics', createdDate: '2024-01-10' },
    { id: 'Q002', type: 'Coding', difficulty: 'Hard', topic: 'Dynamic Programming', createdDate: '2024-01-11' },
    { id: 'Q003', type: 'MCQ', difficulty: 'Medium', topic: 'SQL Joins', createdDate: '2024-01-12' },
    { id: 'Q004', type: 'Coding', difficulty: 'Medium', topic: 'Binary Trees', createdDate: '2024-01-13' },
    { id: 'Q005', type: 'MCQ', difficulty: 'Easy', topic: 'Python Syntax', createdDate: '2024-01-14' },
    { id: 'Q006', type: 'Coding', difficulty: 'Hard', topic: 'Graph Algorithms', createdDate: '2024-01-15' },
    { id: 'Q007', type: 'MCQ', difficulty: 'Medium', topic: 'OOP Concepts', createdDate: '2024-01-16' },
    { id: 'Q008', type: 'MCQ', difficulty: 'Hard', topic: 'Database Normalization', createdDate: '2024-01-17' },
  ]);

  const [toasts, setToasts] = useState([]);

  const addNotification = (message, type = 'info') => {
    const newNotif = {
      id: Date.now(),
      message,
      time: 'Just now',
      read: false,
      type,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addExam = (exam) => {
    const newExam = {
      ...exam,
      id: Date.now(),
      candidates: 0,
      status: 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
    };
    setExams(prev => [newExam, ...prev]);
    addNotification(`Exam "${exam.name}" created successfully`, 'success');
    showToast(`Exam "${exam.name}" created successfully!`, 'success');
  };

  const addQuestion = (question) => {
    const newQ = {
      ...question,
      id: `Q${String(questions.length + 1).padStart(3, '0')}`,
      createdDate: new Date().toISOString().split('T')[0],
    };
    setQuestions(prev => [newQ, ...prev]);
    addNotification(`New question added to Question Bank`, 'info');
    showToast('Question saved to Question Bank!', 'success');
  };

  const deleteQuestion = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    showToast('Question deleted.', 'info');
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return (
    <AppContext.Provider value={{
      notifications, addNotification, markAllRead,
      exams, addExam,
      questions, addQuestion, deleteQuestion,
      toasts, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
};
