import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Icon = {
  Search: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>),
  Assessment: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>),
  Interview: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  Certificate: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>),
  University: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
  Dashboard: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  ChevronLeft: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>),
  ChevronRight: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>),
  Calendar: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>),
  Clock: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  ClipboardList: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>),
  User: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Link: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>),
  Download: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>),
  Share: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>),
  Phone: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>),
  CheckCircle: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  XCircle: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>),
  AlertCircle: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>),
  Inbox: () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>),
  MoreVertical: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>),
  Flash: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  Play: () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="5 3 19 12 5 21 5 3"/></svg>),
  MapPin: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>),
  Mail: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  ExternalLink: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>),
  TrendingUp: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>),
  Activity: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
  ArrowRight: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>),
  Star: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  Bell: () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  FileText: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>),
  BookOpen: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  Hash: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>),
};

/* ── THEME ── */
const T = {
  bg:          "#CFF4F7",
  card:        "#ffffff",
  border:      "#b8eaee",
  text:        "#0A2A41",
  muted:       "#3d6878",
  dim:         "#7aacba",
  accent:      "#2BB1A8",
  accentSoft:  "#d9f2f4",
  green:       "#0a8f5c",
  greenSoft:   "#d9f5ec",
  amber:       "#b45309",
  amberSoft:   "#fef3c7",
  red:         "#dc2626",
  redSoft:     "#fee2e2",
  purple:      "#0A2A41",
  purpleSoft:  "#d9eaf5",
  navy:        "#0A2A41",
  navySoft:    "#d9f2f4",
  lightCyan:   "#F2FBFF",
};

const STUDENT = {
  name: "Alex Martin", initials: "AM", role: "B.Tech Computer Science",
  rollNo: "CS21B047", email: "alex.martin@university.edu",
  semester: "Semester 6", cgpa: "8.7", resumeUrl: "#",
  college: "R.M.K. Group of Institutions", batch: "2025",
};

const HIRING_EXAMS = [
  { id: 1, exam: "Data Structures Assessment", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "90 min", questions: 45, date: "Today, 2:00 PM", endDate: "18 Dec 2024", status: "live", tags: ["DSA", "Algorithms"] },
  { id: 2, exam: "Backend Developer Test", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "60 min", questions: 30, date: "Tomorrow, 10:00 AM", endDate: "15 Nov 2024", status: "assigned", tags: ["Node.js", "SQL"] },
  { id: 3, exam: "System Design Round", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "75 min", questions: 20, date: "Mar 10", endDate: "15 Nov 2024", status: "assigned", tags: ["Architecture", "Scalability"] },
  { id: 4, exam: "Full Stack Assessment", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "120 min", questions: 50, date: "Mar 15", endDate: "20 Nov 2024", status: "assigned", tags: ["React", "Node.js", "MongoDB"] },
  { id: 5, exam: "Python & ML Fundamentals", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "60 min", questions: 35, date: "Feb 28", endDate: "10 Mar 2024", status: "completed", tags: ["Python", "ML Basics"] },
  { id: 6, exam: "Cloud Infrastructure Test", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", duration: "45 min", questions: 25, date: "Jan 20", endDate: "25 Jan 2024", status: "completed", tags: ["AWS", "DevOps"] },
];

const INTERVIEWS = [
  { id: 100, type: "Technical Interview", role: "Software Engineer – Full Stack", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Mar 11, 2:00 PM", duration: "60 min", interviewer: "Rajesh Kumar", status: "confirmed", result: null, meetingLink: "https://teams.microsoft.com/l/virtusa-mar11" },
  { id: 101, type: "Technical Interview", role: "Backend Developer", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Mar 12, 10:00 AM", duration: "45 min", interviewer: "Sarah Johnson", status: "scheduled", result: null, meetingLink: "https://zoom.us/j/91234567890" },
  { id: 102, type: "HR Interview", role: "Graduate Trainee – Java", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Final", date: "Mar 15, 2:00 PM", duration: "30 min", interviewer: "Alex Chen", status: "scheduled", result: null, meetingLink: "https://google.meet/abc-def-ghi" },
  { id: 103, type: "Behavioral Interview", role: "Associate Consultant", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 2", date: "Mar 14, 3:30 PM", duration: "45 min", interviewer: "Emily Davis", status: "scheduled", result: null, meetingLink: "https://teams.microsoft.com/l/virtusa-mar14" },
  { id: 104, type: "Technical Interview", role: "Cloud Solutions Engineer", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 2", date: "Mar 20, 11:00 AM", duration: "60 min", interviewer: "Marco Rossi", status: "upcoming", result: null, meetingLink: "https://zoom.us/j/91245678901" },
  { id: 105, type: "Coding Interview", role: "Software Engineer – Data", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 1", date: "Feb 20, 9:00 AM", duration: "50 min", interviewer: "Priya Patel", status: "completed", result: "selected", meetingLink: "" },
  { id: 106, type: "HR Interview", role: "Graduate Programme – DevOps", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Initial", date: "Feb 10, 1:00 PM", duration: "20 min", interviewer: "Lisa Zhang", status: "completed", result: "rejected", meetingLink: "" },
  { id: 107, type: "Technical Interview", role: "QA Automation Engineer", company: "Virtusa", companyColor: "#2BB1A8", companyBg: "#d9f2f4", logo: "V", round: "Round 2", date: "Feb 28, 3:00 PM", duration: "45 min", interviewer: "Nathan Park", status: "completed", result: "waiting", meetingLink: "" },
];

const UNI_EXAMS = [
  { id: 200, exam: "React Semester Examination", subject: "Web Technologies", code: "CS4012", credits: 4, semester: "Semester 6", date: "Today, 2:30 PM", time: "2:30 PM – 5:30 PM", hall: "Block A, Hall 3", status: "live", duration: "3 hrs", maxMarks: 100, verifyCode: "EX-CS4012-2025-041", syllabus: ["React Fundamentals & JSX", "Hooks & Context API", "State Management (Redux)", "React Router v6", "Testing with Jest & RTL"] },
  { id: 201, exam: "Data Structures & Algorithms", subject: "Core Computer Science", code: "CS3005", credits: 4, semester: "Semester 6", date: "Apr 16, 2025", time: "2:00 PM – 5:00 PM", hall: "Block B, Hall 1", status: "upcoming", duration: "3 hrs", maxMarks: 100, syllabus: ["Arrays, Linked Lists & Stacks", "Trees & Graphs", "Sorting & Searching", "Dynamic Programming", "Complexity Analysis"] },
  { id: 202, exam: "Database Management Systems", subject: "Core Computer Science", code: "CS3008", credits: 3, semester: "Semester 6", date: "Mar 5, 2025", time: "9:00 AM – 12:00 PM", hall: "Block C, Hall 2", status: "completed", duration: "3 hrs", maxMarks: 100, grade: "A", marks: 88, syllabus: ["SQL & Normalization", "Transactions & ACID", "Indexing & Query Optimization", "NoSQL Basics"] },
  { id: 203, exam: "Operating Systems", subject: "Core Computer Science", code: "CS3006", credits: 3, semester: "Semester 5", date: "Nov 20, 2024", time: "2:00 PM – 5:00 PM", hall: "Block A, Hall 2", status: "completed", duration: "3 hrs", maxMarks: 100, grade: "B+", marks: 76, syllabus: ["Process Management", "Memory Management", "File Systems", "Deadlocks & Scheduling"] },
];

const CERTIFICATIONS = [
  { id: 300, name: "Oracle Certified Professional", subtitle: "Java SE 17 Developer", organization: "Oracle Corporation", orgShort: "Oracle", orgColor: "#c2410c", orgBg: "#fff7ed", credentialId: "OCP-2024-JS17-48291", issueDate: "Feb 12, 2024", expirationDate: "Feb 12, 2027", status: "active", level: "Professional", examScore: 91, skills: ["Java SE 17", "OOP Concepts", "Streams & Lambdas", "Concurrency", "Modules"], verifyUrl: "https://catalog.oracle.com/verify/OCP-2024-JS17-48291" },
  { id: 301, name: "AWS Certified Solutions Architect", subtitle: "Associate Level", organization: "Amazon Web Services", orgShort: "AWS", orgColor: "#1e40af", orgBg: "#eff6ff", credentialId: "AWS-SAA-C03-20240318", issueDate: "Mar 18, 2024", expirationDate: "Mar 18, 2027", status: "active", level: "Associate", examScore: 87, skills: ["EC2 & VPC", "S3 & Storage", "IAM & Security", "Lambda & Serverless", "RDS & DynamoDB"], verifyUrl: "https://aws.amazon.com/verification/AWS-SAA-C03-20240318" },
  { id: 302, name: "Google Cloud Associate", subtitle: "Cloud Engineer", organization: "Google Cloud", orgShort: "GCP", orgColor: "#1967d2", orgBg: "#dbeafe", credentialId: "GCP-ACE-2024-92837", issueDate: null, expirationDate: null, status: "scheduled", examDate: "Apr 20, 2025", examTime: "10:00 AM", examCenter: "Prometric – Chennai", level: "Associate", examScore: null, skills: ["Compute Engine", "GKE", "Cloud Storage", "IAM", "Networking"], verifyUrl: null },
];

const NAV_ITEMS = [
  { icon: "dashboard", label: "Dashboard", page: "dashboard" },
  { icon: "assessment", label: "Hiring Assessments", page: "hiring" },
  { icon: "university", label: "University Exams", page: "university" },
  { icon: "certificate", label: "Certifications", page: "certifications" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [hiringTab, setHiringTab] = useState("assessments");
  const [selectedCert, setSelectedCert] = useState(null);
  const [selectedUniExam, setSelectedUniExam] = useState(null);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const fade = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.4s ease ${d}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${d}ms`,
  });

  const hiringTabs = [
    { id: "assessments", label: "Active Assessments", count: HIRING_EXAMS.filter(e => ["live","assigned"].includes(e.status)).length },
    { id: "interviews", label: "Interviews", count: INTERVIEWS.length },
    { id: "completed", label: "Completed", count: HIRING_EXAMS.filter(e => e.status === "completed").length },
  ];

  const goToPage = (p) => {
    setPage(p); setSelectedCert(null); setSelectedUniExam(null);
    window.history.pushState({ dashPage: p }, "", `#${p}`);
  };

  useEffect(() => {
    const onPop = (e) => { const p = e.state?.dashPage || "dashboard"; setPage(p); setSelectedCert(null); setSelectedUniExam(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; font-family: 'Geist', 'Inter', sans-serif; color: ${T.text}; }

        @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(2.4)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 8px; }

        .na-nav { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:7px; cursor:pointer; font-size:13px; font-weight:500; color:${T.muted}; transition:background .16s,color .16s; user-select:none; }
        .na-nav:hover { background:${T.accentSoft}; color:${T.accent}; }
        .na-nav.active { background:${T.accentSoft}; color:${T.accent}; font-weight:600; }

        .na-card { background:#fff; border:1px solid ${T.border}; border-radius:10px; box-shadow:0 1px 3px rgba(43,177,168,0.06); transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s,border-color .2s; }

        .na-tab { padding:7px 14px; border-radius:7px; cursor:pointer; font-size:13px; font-weight:500; color:${T.muted}; border:1px solid transparent; transition:all .16s; user-select:none; white-space:nowrap; display:flex; align-items:center; gap:7px; font-family:'Geist',sans-serif; background:none; }
        .na-tab:hover { color:${T.text}; background:${T.bg}; border-color:${T.border}; }
        .na-tab.active { color:${T.accent}; background:${T.accentSoft}; border-color:${T.accent}33; font-weight:600; }

        .na-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:9px 18px; border-radius:7px; cursor:pointer; font-size:13px; font-weight:600; border:none; font-family:'Geist',sans-serif; transition:all .16s; letter-spacing:-.1px; }
        .na-btn-primary { background:${T.accent}; color:#fff; box-shadow:0 1px 4px rgba(43,177,168,.25); }
        .na-btn-primary:hover { background:#1d9e96; transform:translateY(-1px); box-shadow:0 4px 12px rgba(43,177,168,.35); }
        .na-btn-danger { background:${T.red}; color:#fff; }
        .na-btn-danger:hover { background:#b91c1c; transform:translateY(-1px); }
        .na-btn-ghost { background:transparent; color:${T.accent}; border:1px solid ${T.border}; }
        .na-btn-ghost:hover { background:${T.accentSoft}; border-color:${T.accent}44; }
        .na-btn-sm { padding:6px 13px; font-size:12px; }

        .na-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11.5px; font-weight:600; }
        .na-tag { display:inline-block; padding:3px 9px; border-radius:5px; font-size:11px; font-weight:600; background:${T.accentSoft}; color:${T.accent}; border:1px solid ${T.border}; }
        .na-avatar { width:36px; height:36px; border-radius:8px; background:${T.accent}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .na-logo { display:flex; align-items:center; justify-content:center; border-radius:7px; font-weight:700; flex-shrink:0; }
        .na-row:hover { background:${T.lightCyan}; }
        .na-back { display:inline-flex; align-items:center; gap:5px; background:none; border:none; cursor:pointer; font-size:13px; font-weight:600; color:${T.muted}; font-family:'Geist',sans-serif; padding:0; transition:color .15s,transform .15s; }
        .na-back:hover { color:${T.accent}; transform:translateX(-2px); }

        .live-dot { width:7px; height:7px; border-radius:50%; background:${T.red}; flex-shrink:0; position:relative; }
        .live-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; background:${T.red}44; animation:live-pulse 1.8s ease-in-out infinite; }

        .credential-box { background:${T.lightCyan}; border:1px solid ${T.border}; border-radius:8px; padding:12px 15px; font-family:'Geist Mono',monospace; font-size:12px; color:${T.muted}; }
        .oracle-left { border-left:3px solid #ea580c !important; }
        .aws-left    { border-left:3px solid #2563eb !important; }
        .gcp-left    { border-left:3px solid #1967d2 !important; }

        .qa-card { background:#fff; border:1px solid ${T.border}; border-radius:10px; padding:16px 18px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:13px; }
        .qa-card:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(43,177,168,0.12); border-color:${T.accent}55; }

        .urgency-bar { height:3px; border-radius:2px; }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:T.bg, fontFamily:"'Geist',sans-serif" }}>

        {/* HEADER */}
        <header style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, height:56, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:T.accent, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon.Flash /></div>
            <span style={{ fontSize:14.5, fontWeight:700, letterSpacing:"-.4px", color:T.text }}>NeuroAssess</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:9, background:T.lightCyan, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 13px", width:360 }}>
            <span style={{ color:T.dim, display:"flex" }}><Icon.Search /></span>
            <input type="text" placeholder="Search assessments, exams, interviews…" style={{ background:"none", border:"none", outline:"none", fontSize:13, color:T.text, width:"100%", fontFamily:"'Geist',sans-serif" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div className="na-avatar">{STUDENT.initials}</div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:T.text, lineHeight:1.3 }}>{STUDENT.name}</div>
              <div style={{ fontSize:11, color:T.dim }}>{STUDENT.rollNo}</div>
            </div>
            <span style={{ color:T.dim, display:"flex" }}><Icon.MoreVertical /></span>
          </div>
        </header>

        <div style={{ display:"flex", flex:1 }}>

          {/* SIDEBAR */}
          <aside style={{ width:230, flexShrink:0, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", ...fade(0) }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2, padding:"14px 10px" }}>
              {NAV_ITEMS.map((item, i) => (
                <div key={i} className={`na-nav${page === item.page ? " active" : ""}`}
                  onClick={() => goToPage(item.page)} style={fade(i * 35)}>
                  <span style={{ display:"flex", color: page === item.page ? T.accent : T.dim }}>
                    {item.icon === "dashboard"   && <Icon.Dashboard />}
                    {item.icon === "assessment"  && <Icon.Assessment />}
                    {item.icon === "university"  && <Icon.University />}
                    {item.icon === "certificate" && <Icon.Certificate />}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </aside>

          {/* MAIN */}
          <main style={{ flex:1, padding:"26px 30px", overflowY:"auto" }}>

            {page === "dashboard" && (
              <DashboardPage student={STUDENT} hiringExams={HIRING_EXAMS} interviews={INTERVIEWS} uniExams={UNI_EXAMS} certifications={CERTIFICATIONS} onNavigate={goToPage} fade={fade} T={T} />
            )}

            {page === "hiring" && (
              <>
                <div style={{ marginBottom:22, ...fade(40) }}>
                  <button className="na-back" style={{ marginBottom:10 }} onClick={() => goToPage("dashboard")}><Icon.ChevronLeft /> Dashboard</button>
                  <h1 style={{ fontSize:21, fontWeight:700, color:T.text, letterSpacing:"-.5px", marginBottom:3 }}>Hiring Assessments</h1>
                  <p style={{ fontSize:13, color:T.muted }}>Manage your placement assessments and scheduled interviews</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22, ...fade(60) }}>
                  {[
                    { label:"Active Tests", value: HIRING_EXAMS.filter(e=>["live","assigned"].includes(e.status)).length, color:T.accent },
                    { label:"Interviews", value: INTERVIEWS.length, color:T.navy },
                    { label:"Completed", value: HIRING_EXAMS.filter(e=>e.status==="completed").length, color:T.green },
                  ].map((s,i) => (
                    <div key={i} className="na-card" style={{ padding:"15px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:13, fontWeight:500, color:T.muted }}>{s.label}</span>
                      <span style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:"-1px" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:5, marginBottom:18, borderBottom:`1px solid ${T.border}`, paddingBottom:12, ...fade(80) }}>
                  {hiringTabs.map(tab => (
                    <button key={tab.id} className={`na-tab${hiringTab===tab.id?" active":""}`} onClick={()=>setHiringTab(tab.id)}>
                      {tab.label}
                      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:17, height:17, padding:"0 5px", borderRadius:9, fontSize:10, fontWeight:700, background: hiringTab===tab.id ? T.accent : T.border, color: hiringTab===tab.id ? "#fff" : T.muted }}>{tab.count}</span>
                    </button>
                  ))}
                </div>
                {hiringTab === "assessments" && (
                  <div style={fade(100)}>
                    {HIRING_EXAMS.filter(e=>["live","assigned"].includes(e.status)).length === 0 ? <EmptyState label="No active assessments" /> :
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                        {HIRING_EXAMS.filter(e=>["live","assigned"].includes(e.status)).map(exam => (
                          <HiringCard key={exam.id} exam={exam} onStart={()=>navigate("/exam-verify",{state:{exam}})} T={T} />
                        ))}
                      </div>
                    }
                  </div>
                )}
                {hiringTab === "interviews" && (
                  <div style={fade(100)}>
                    {INTERVIEWS.filter(i=>["confirmed","scheduled","upcoming"].includes(i.status)).length > 0 && (
                      <><SectionLabel>Upcoming</SectionLabel>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14, marginBottom:26 }}>
                          {INTERVIEWS.filter(i=>["confirmed","scheduled","upcoming"].includes(i.status)).map(iv => <InterviewCard key={iv.id} interview={iv} T={T} />)}
                        </div></>
                    )}
                    {INTERVIEWS.filter(i=>i.status==="completed").length > 0 && (
                      <><SectionLabel>Completed Interviews</SectionLabel>
                        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:26 }}>
                          {INTERVIEWS.filter(i=>i.status==="completed").map(iv => <CompletedInterviewRow key={iv.id} interview={iv} T={T} />)}
                        </div></>
                    )}
                    <SectionLabel>All Interviews</SectionLabel>
                    <InterviewTable interviews={INTERVIEWS} T={T} />
                  </div>
                )}
                {hiringTab === "completed" && (
                  <div style={fade(100)}>
                    {HIRING_EXAMS.filter(e=>e.status==="completed").length === 0 ? <EmptyState label="No completed assessments" /> :
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                        {HIRING_EXAMS.filter(e=>e.status==="completed").map(exam => <HiringCard key={exam.id} exam={exam} onStart={null} T={T} />)}
                      </div>
                    }
                  </div>
                )}
              </>
            )}

            {page === "university" && (
              <>
                {selectedUniExam ? (
                  <><button className="na-back" style={{ marginBottom:18 }} onClick={()=>setSelectedUniExam(null)}><Icon.ChevronLeft /> Back to Exams</button>
                    <UniExamDetail exam={selectedUniExam} onVerify={()=>navigate("/exam-verify",{state:{exam:selectedUniExam}})} T={T} /></>
                ) : (
                  <>
                    <div style={{ marginBottom:22, ...fade(40) }}>
                      <button className="na-back" style={{ marginBottom:10 }} onClick={() => goToPage("dashboard")}><Icon.ChevronLeft /> Dashboard</button>
                      <h1 style={{ fontSize:21, fontWeight:700, color:T.text, letterSpacing:"-.5px", marginBottom:3 }}>University Exams</h1>
                      <p style={{ fontSize:13, color:T.muted }}>Academic schedule · B.Tech Computer Science · Semester 6</p>
                    </div>
                    {UNI_EXAMS.filter(e=>e.status==="live").length > 0 && (
                      <div style={{ marginBottom:26, ...fade(50) }}>
                        <SectionLabel>Live Now</SectionLabel>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
                          {UNI_EXAMS.filter(e=>e.status==="live").map(exam => <UniCard key={exam.id} exam={exam} onClick={()=>setSelectedUniExam(exam)} T={T} />)}
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom:26, ...fade(70) }}>
                      <SectionLabel>Upcoming Examinations</SectionLabel>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
                        {UNI_EXAMS.filter(e=>e.status==="upcoming").map(exam => <UniCard key={exam.id} exam={exam} onClick={()=>setSelectedUniExam(exam)} T={T} />)}
                      </div>
                    </div>
                    <div style={fade(90)}>
                      <SectionLabel>Past Examinations</SectionLabel>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16 }}>
                        {UNI_EXAMS.filter(e=>e.status==="completed").map(exam => <UniCard key={exam.id} exam={exam} onClick={()=>setSelectedUniExam(exam)} T={T} />)}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {page === "certifications" && (
              <>
                {selectedCert ? (
                  <><button className="na-back" style={{ marginBottom:18 }} onClick={()=>setSelectedCert(null)}><Icon.ChevronLeft /> Back to Certifications</button>
                    <CertDetail cert={selectedCert} T={T} /></>
                ) : (
                  <>
                    <div style={{ marginBottom:22, ...fade(40) }}>
                      <button className="na-back" style={{ marginBottom:10 }} onClick={() => goToPage("dashboard")}><Icon.ChevronLeft /> Dashboard</button>
                      <h1 style={{ fontSize:21, fontWeight:700, color:T.text, letterSpacing:"-.5px", marginBottom:3 }}>Certifications</h1>
                      <p style={{ fontSize:13, color:T.muted }}>Industry credentials and professional certifications</p>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:20, ...fade(60) }}>
                      {CERTIFICATIONS.map(cert => <CertCard key={cert.id} cert={cert} onClick={()=>setSelectedCert(cert)} T={T} />)}
                    </div>
                  </>
                )}
              </>
            )}

          </main>
        </div>
      </div>
    </>
  );
}

function DashboardPage({ student, hiringExams, interviews, uniExams, certifications, onNavigate, fade, T }) {
  const liveExams   = [...hiringExams.filter(e=>e.status==="live"), ...uniExams.filter(e=>e.status==="live")];
  const activeTests = hiringExams.filter(e=>["live","assigned"].includes(e.status)).length;
  const upcomingIVs = interviews.filter(i=>["confirmed","scheduled","upcoming"].includes(i.status)).length;
  const activeCerts = certifications.filter(c=>c.status==="active").length;
  const upcomingUni = uniExams.filter(e=>e.status==="upcoming").length;

  const recentActivity = [
    { label: "Cloud Infrastructure Test completed", time: "Jan 20", color: T.green, icon: <Icon.CheckCircle /> },
    { label: "Python & ML Fundamentals completed", time: "Feb 28", color: T.green, icon: <Icon.CheckCircle /> },
    { label: "Coding Interview – Software Engineer", time: "Feb 20", color: T.green, icon: <Icon.CheckCircle /> },
    { label: "AWS Certified Solutions Architect earned", time: "Mar 18", color: T.accent, icon: <Icon.Certificate /> },
    { label: "HR Interview – Graduate Programme", time: "Feb 10", color: T.red, icon: <Icon.XCircle /> },
  ];

  const upcomingDeadlines = [
    { label: "Data Structures Assessment", sub: "Virtusa · DSA", date: "Today, 2:00 PM", urgency: "high" },
    { label: "React Semester Examination", sub: "Web Technologies · Live", date: "Today, 2:30 PM", urgency: "high" },
    { label: "Technical Interview – Rajesh", sub: "Virtusa · Round 1", date: "Mar 11, 2:00 PM", urgency: "medium" },
    { label: "Backend Developer Test", sub: "Virtusa · Node.js", date: "Tomorrow, 10 AM", urgency: "medium" },
    { label: "DSA Semester Exam", sub: "CS3005 · Block B, Hall 1", date: "Apr 16", urgency: "low" },
  ];

  const urgencyColor = { high: T.red, medium: T.amber, low: T.accent };

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ marginBottom:26, ...fade(30) }}>
        <div style={{ background:`linear-gradient(135deg, ${T.navy} 0%, #1C3240 50%, ${T.accent} 100%)`, borderRadius:14, padding:"26px 30px", color:"#fff", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
          <div style={{ position:"absolute", bottom:-30, right:80, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.65)", letterSpacing:".5px", marginBottom:6, textTransform:"uppercase" }}>Welcome back</div>
            <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-.6px", marginBottom:4 }}>{student.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", marginBottom:18 }}>{student.role} · {student.rollNo} · {student.semester} · CGPA {student.cgpa}</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ background:"rgba(255,255,255,.15)", backdropFilter:"blur(8px)", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                <Icon.Mail /> {student.email}
              </div>
              <div style={{ background:"rgba(255,255,255,.15)", backdropFilter:"blur(8px)", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600 }}>
                Batch {student.batch} · {student.college}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:26, ...fade(50) }}>
        {[
          { label:"Active Tests", value: activeTests, color: T.accent, bg: T.accentSoft, icon: <Icon.Assessment />, page:"hiring" },
          { label:"Upcoming Interviews", value: upcomingIVs, color: T.navy, bg: T.navySoft, icon: <Icon.Interview />, page:"hiring" },
          { label:"University Exams", value: upcomingUni, color: T.navy, bg: "#d9eaf5", icon: <Icon.University />, page:"university" },
          { label:"Certifications", value: activeCerts, color: T.green, bg: T.greenSoft, icon: <Icon.Certificate />, page:"certifications" },
        ].map((s,i) => (
          <div key={i} className="na-card" style={{ padding:"18px 20px", cursor:"pointer" }}
            onClick={() => onNavigate(s.page)}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(43,177,168,0.12)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", color:s.color }}>{s.icon}</div>
              <span style={{ fontSize:11, fontWeight:600, color:T.dim, display:"flex", alignItems:"center", gap:3 }}>View <Icon.ArrowRight /></span>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, letterSpacing:"-1.5px", marginBottom:3 }}>{s.value}</div>
            <div style={{ fontSize:12, fontWeight:500, color:T.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live alert */}
      {liveExams.length > 0 && (
        <div style={{ marginBottom:22, ...fade(60) }}>
          <div style={{ background:T.redSoft, border:`1.5px solid ${T.red}44`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div className="live-dot"/>
              <span style={{ fontSize:12, fontWeight:700, color:T.red, letterSpacing:".5px" }}>LIVE NOW — Action Required</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {liveExams.map((ex,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff", borderRadius:7, padding:"10px 14px", border:`1px solid ${T.red}22` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{ex.exam}</div>
                    <div style={{ fontSize:11.5, color:T.muted }}>{ex.company || ex.subject} · {ex.date}</div>
                  </div>
                  <button className="na-btn na-btn-danger na-btn-sm"><Icon.Play /> Enter Now</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two-col grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22, ...fade(70) }}>
        <div className="na-card" style={{ overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ color:T.accent, display:"flex" }}><Icon.Calendar /></span>
              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Upcoming Deadlines</span>
            </div>
          </div>
          <div>
            {upcomingDeadlines.map((d,i) => (
              <div key={i} style={{ padding:"11px 18px", borderBottom: i < upcomingDeadlines.length-1 ? `1px solid ${T.border}` : "none", display:"flex", gap:12, alignItems:"center" }}>
                <div className="urgency-bar" style={{ width:3, height:36, background:urgencyColor[d.urgency], borderRadius:2, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:T.text, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.label}</div>
                  <div style={{ fontSize:11, color:T.dim }}>{d.sub}</div>
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:urgencyColor[d.urgency], flexShrink:0, textAlign:"right" }}>{d.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="na-card" style={{ overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ color:T.accent, display:"flex" }}><Icon.Activity /></span>
            <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Recent Activity</span>
          </div>
          <div>
            {recentActivity.map((a,i) => (
              <div key={i} style={{ padding:"11px 18px", borderBottom: i < recentActivity.length-1 ? `1px solid ${T.border}` : "none", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:a.color+"18", display:"flex", alignItems:"center", justifyContent:"center", color:a.color, flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.label}</div>
                </div>
                <div style={{ fontSize:11, color:T.dim, flexShrink:0 }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:T.dim, letterSpacing:".6px", textTransform:"uppercase", marginBottom:12 }}>{children}</div>;
}

function EmptyState({ label }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:10, padding:"52px 40px", textAlign:"center", color:T.dim }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10, opacity:.3 }}><Icon.Inbox /></div>
      <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
    </div>
  );
}

function HiringCard({ exam, onStart, T }) {
  const isLive      = exam.status === "live";
  const isCompleted = exam.status === "completed";
  return (
    <div className="na-card" style={{ overflow:"hidden", display:"flex", flexDirection:"column", borderColor: isLive ? `${T.red}55` : T.border }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 22px rgba(43,177,168,0.12)"; e.currentTarget.style.borderColor=isLive?T.red:`${T.accent}66`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(43,177,168,0.06)"; e.currentTarget.style.borderColor=isLive?`${T.red}55`:T.border; }}>
      <div style={{ padding:"10px 15px", background:exam.companyBg, display:"flex", alignItems:"center", gap:9, borderBottom:`1px solid ${exam.companyColor}20` }}>
        <div style={{ width:26, height:26, borderRadius:6, background:"rgba(255,255,255,.65)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, color:exam.companyColor }}>{exam.logo}</div>
        <span style={{ fontSize:12.5, fontWeight:700, color:exam.companyColor }}>{exam.company}</span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          {isLive      && <><div className="live-dot"/><span style={{ fontSize:10, fontWeight:700, color:T.red, letterSpacing:".5px" }}>LIVE</span></>}
          {isCompleted && <span className="na-badge" style={{ background:T.greenSoft, color:T.green }}><Icon.CheckCircle /> Completed</span>}
          {!isLive&&!isCompleted && <span className="na-badge" style={{ background:T.accentSoft, color:T.accent }}>Assigned</span>}
        </div>
      </div>
      <div style={{ padding:15, flex:1, display:"flex", flexDirection:"column", gap:11 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:T.text, lineHeight:1.4 }}>{exam.exam}</div>
        <div style={{ display:"flex", gap:14 }}>
          <MPill icon={<Icon.ClipboardList/>} label={`${exam.questions} Questions`} T={T}/>
          <MPill icon={<Icon.Clock/>} label={exam.duration} T={T}/>
        </div>
        <div style={{ display:"flex", gap:14, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
          <DPill label="Opens" value={exam.date} T={T}/>
          <DPill label="Closes" value={exam.endDate} T={T}/>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {exam.tags.map((tag,i)=><span key={i} className="na-tag">{tag}</span>)}
        </div>
        {isLive && onStart && (
          <button className="na-btn na-btn-danger" style={{ width:"100%", marginTop:2 }} onClick={onStart}>
            <Icon.Play /> Start Assessment
          </button>
        )}
      </div>
    </div>
  );
}

function MPill({ icon, label, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ color:T.dim, display:"flex" }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:500, color:T.muted }}>{label}</span>
    </div>
  );
}

function DPill({ label, value, T }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ color:T.dim, display:"flex" }}><Icon.Calendar /></span>
      <div>
        <div style={{ fontSize:10, color:T.dim, fontWeight:600, letterSpacing:".3px" }}>{label.toUpperCase()}</div>
        <div style={{ fontSize:11.5, fontWeight:600, color:T.text }}>{value}</div>
      </div>
    </div>
  );
}

const IV_STATUS = {
  confirmed: { bg:"#d9f5ec", color:"#0a8f5c" },
  scheduled: { bg:"#d9f2f4", color:"#2BB1A8" },
  upcoming:  { bg:"#fef3c7", color:"#b45309" },
  completed: { bg:"#f1f3f6", color:"#64707d" },
};

const RESULT_CONFIG = {
  selected: { label:"Selected", bg:"#d9f5ec", color:"#0a8f5c", Icon: () => <Icon.CheckCircle /> },
  rejected: { label:"Not Selected", bg:"#fee2e2", color:"#dc2626", Icon: () => <Icon.XCircle /> },
  waiting:  { label:"Awaiting Result", bg:"#fef3c7", color:"#b45309", Icon: () => <Icon.AlertCircle /> },
};

function InterviewCard({ interview: iv, T }) {
  const sc = IV_STATUS[iv.status] || { bg:T.bg, color:T.muted };
  return (
    <div className="na-card" style={{ overflow:"hidden", display:"flex", flexDirection:"column" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 22px rgba(43,177,168,0.12)"; e.currentTarget.style.borderColor=`${T.accent}55`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(43,177,168,0.06)"; e.currentTarget.style.borderColor=T.border; }}>
      <div style={{ padding:"10px 14px", background:iv.companyBg, display:"flex", alignItems:"center", gap:8, borderBottom:`1px solid ${iv.companyColor}20` }}>
        <div className="na-logo" style={{ width:24, height:24, background:"rgba(255,255,255,.6)", color:iv.companyColor, fontSize:10 }}>{iv.logo}</div>
        <span style={{ fontSize:12.5, fontWeight:700, color:iv.companyColor }}>{iv.company}</span>
        <span className="na-badge" style={{ marginLeft:"auto", background:sc.bg, color:sc.color }}>{iv.status.charAt(0).toUpperCase()+iv.status.slice(1)}</span>
      </div>
      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:1 }}>{iv.type}</div>
          <div style={{ fontSize:11.5, color:T.muted }}>{iv.role} · {iv.round}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7, paddingBottom:10, borderBottom:`1px solid ${T.border}` }}>
          {[{icon:<Icon.Calendar/>,v:iv.date},{icon:<Icon.User/>,v:iv.interviewer},{icon:<Icon.Clock/>,v:iv.duration}].map((r,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ color:T.dim, display:"flex" }}>{r.icon}</span>
              <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>{r.v}</span>
            </div>
          ))}
          {iv.meetingLink && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
              <span style={{ color:T.dim, display:"flex", marginTop:1 }}><Icon.Link/></span>
              <span style={{ fontSize:11, color:T.accent, wordBreak:"break-all", lineHeight:1.5 }}>{iv.meetingLink}</span>
            </div>
          )}
        </div>
        <button className="na-btn na-btn-primary" style={{ width:"100%" }} onClick={()=>window.open(iv.meetingLink,"_blank")}>
          <Icon.Phone /> Join Interview
        </button>
      </div>
    </div>
  );
}

function CompletedInterviewRow({ interview: iv, T }) {
  const rc = iv.result ? RESULT_CONFIG[iv.result] : null;
  return (
    <div className="na-card" style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:16 }}>
      <div className="na-logo" style={{ width:32, height:32, background:iv.companyBg, color:iv.companyColor, fontSize:11, flexShrink:0 }}>{iv.logo}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:T.text, marginBottom:2 }}>{iv.role}</div>
        <div style={{ fontSize:12, color:T.muted }}>{iv.type} · {iv.round} · {iv.date}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <span style={{ fontSize:12, color:T.dim }}>{iv.interviewer}</span>
        {rc && (<span className="na-badge" style={{ background:rc.bg, color:rc.color }}><rc.Icon /> {rc.label}</span>)}
      </div>
    </div>
  );
}

function InterviewTable({ interviews, T }) {
  return (
    <div className="na-card" style={{ overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 145px 95px 105px", gap:10, padding:"10px 18px", background:T.lightCyan, borderBottom:`1px solid ${T.border}`, fontSize:10.5, fontWeight:700, color:T.dim, letterSpacing:".5px", textTransform:"uppercase" }}>
        <div>Company & Role</div><div style={{textAlign:"center"}}>Interviewer</div><div style={{textAlign:"center"}}>Date</div><div style={{textAlign:"center"}}>Duration</div><div style={{textAlign:"right"}}>Status</div>
      </div>
      {interviews.map((iv,i)=>{
        const s = IV_STATUS[iv.status] || {bg:T.bg, color:T.muted};
        const rc = iv.result ? RESULT_CONFIG[iv.result] : null;
        return (
          <div key={i} className="na-row" style={{ display:"grid", gridTemplateColumns:"1fr 120px 145px 95px 105px", gap:10, padding:"13px 18px", borderBottom:i!==interviews.length-1?`1px solid ${T.border}`:"none", alignItems:"center", transition:"background .12s" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <div className="na-logo" style={{ width:24, height:24, background:iv.companyBg, color:iv.companyColor, fontSize:9.5 }}>{iv.logo}</div>
                <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{iv.company}</span>
              </div>
              <div style={{ fontSize:11, color:T.muted, paddingLeft:32 }}>{iv.role} · {iv.round}</div>
            </div>
            <div style={{ fontSize:12, color:T.text, textAlign:"center", fontWeight:500 }}>{iv.interviewer}</div>
            <div style={{ fontSize:12, color:T.text, textAlign:"center" }}>{iv.date}</div>
            <div style={{ fontSize:11.5, color:T.muted, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}><Icon.Clock/>{iv.duration}</div>
            <div style={{ textAlign:"right" }}>
              {rc ? <span className="na-badge" style={{ background:rc.bg, color:rc.color }}><rc.Icon/>{rc.label}</span>
                  : <span className="na-badge" style={{ background:s.bg, color:s.color }}>{iv.status.charAt(0).toUpperCase()+iv.status.slice(1)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UniCard({ exam, onClick, T }) {
  const isLive     = exam.status === "live";
  const isUpcoming = exam.status === "upcoming";
  const gc = exam.grade === "A" || exam.grade === "A+" ? T.green : exam.grade === "B+" ? T.accent : T.amber;
  const stripColor = isLive ? T.red : isUpcoming ? T.accent : T.green;
  return (
    <div className="na-card" style={{ overflow:"hidden", cursor:"pointer", borderColor: isLive ? `${T.red}55` : T.border }}
      onClick={onClick}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 22px rgba(43,177,168,0.12)"; e.currentTarget.style.borderColor=isLive?T.red:`${T.accent}55`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(43,177,168,0.06)"; e.currentTarget.style.borderColor=isLive?`${T.red}55`:T.border; }}>
      <div style={{ height:3, background:stripColor }} />
      <div style={{ padding:"17px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ padding:"2px 8px", borderRadius:5, background:T.accentSoft, fontSize:10.5, fontWeight:700, color:T.accent, letterSpacing:".3px" }}>{exam.code}</span>
              <span style={{ padding:"2px 8px", borderRadius:5, background:T.lightCyan, fontSize:10.5, fontWeight:600, color:T.muted }}>{exam.semester}</span>
            </div>
            <div style={{ fontSize:14.5, fontWeight:700, color:T.text, lineHeight:1.35, marginBottom:3 }}>{exam.exam}</div>
            <div style={{ fontSize:12, color:T.muted }}>{exam.subject}</div>
          </div>
          {isLive && (<div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}><div className="live-dot"/><span style={{ fontSize:10, fontWeight:700, color:T.red, letterSpacing:".5px" }}>LIVE</span></div>)}
          {isUpcoming && <span className="na-badge" style={{ background:T.accentSoft, color:T.accent, flexShrink:0 }}>Scheduled</span>}
          {!isLive && !isUpcoming && exam.grade && (<div style={{ width:42, height:42, borderRadius:9, background:gc+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:gc, flexShrink:0 }}>{exam.grade}</div>)}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ color:T.dim, display:"flex" }}><Icon.Calendar/></span>
            <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{exam.date}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ color:T.dim, display:"flex" }}><Icon.Clock/></span>
            <span style={{ fontSize:12, color:T.muted }}>{exam.time}</span>
          </div>
          {!isLive && !isUpcoming && exam.marks != null && (<div style={{ marginLeft:"auto", fontSize:12, fontWeight:800, color:gc }}>{exam.marks}/{exam.maxMarks}</div>)}
        </div>
      </div>
    </div>
  );
}

function UniExamDetail({ exam, onVerify, T }) {
  const isLive     = exam.status === "live";
  const isUpcoming = exam.status === "upcoming";
  const gc = exam.grade === "A" || exam.grade === "A+" ? T.green : exam.grade === "B+" ? T.accent : T.amber;
  return (
    <div className="na-card" style={{ overflow:"hidden", borderColor: isLive ? `${T.red}55` : T.border }}>
      <div style={{ height:3, background: isLive ? T.red : isUpcoming ? T.accent : T.green }} />
      <div style={{ padding:"24px 28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${T.border}` }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:9 }}>
              <span style={{ padding:"3px 9px", borderRadius:5, background:T.accentSoft, fontSize:11, fontWeight:700, color:T.accent }}>{exam.code}</span>
              <span style={{ padding:"3px 9px", borderRadius:5, background:T.lightCyan, fontSize:11, fontWeight:600, color:T.muted }}>{exam.semester}</span>
            </div>
            <h1 style={{ fontSize:22, fontWeight:700, color:T.text, letterSpacing:"-.4px", marginBottom:4 }}>{exam.exam}</h1>
            <p style={{ fontSize:13, color:T.muted }}>{exam.subject}</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
            {isLive && (<div style={{ display:"flex", alignItems:"center", gap:6 }}><div className="live-dot"/><span style={{ fontSize:11, fontWeight:700, color:T.red, letterSpacing:".5px" }}>EXAM IN PROGRESS</span></div>)}
            {isUpcoming && <span className="na-badge" style={{ background:T.accentSoft, color:T.accent }}>Scheduled</span>}
            {!isLive && !isUpcoming && exam.grade && (
              <div style={{ textAlign:"center" }}>
                <div style={{ width:56, height:56, borderRadius:12, background:gc+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, color:gc, marginBottom:3 }}>{exam.grade}</div>
                <div style={{ fontSize:11, color:T.muted, fontWeight:600 }}>{exam.marks}/{exam.maxMarks}</div>
              </div>
            )}
          </div>
        </div>
        {isLive && exam.verifyCode && (
          <div style={{ background:T.redSoft, border:`1px solid ${T.red}33`, borderRadius:9, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:T.red, letterSpacing:".5px", marginBottom:4 }}>EXAM VERIFICATION CODE</div>
              <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:16, fontWeight:700, color:T.text, letterSpacing:"2px" }}>{exam.verifyCode}</div>
            </div>
            <button className="na-btn na-btn-danger" onClick={onVerify}><Icon.Play /> Enter Exam</button>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
          {[{label:"DATE",value:exam.date},{label:"TIME",value:exam.time},{label:"HALL",value:exam.hall||"TBA"},{label:"DURATION",value:exam.duration}].map((d,i)=>(
            <div key={i} style={{ background:T.lightCyan, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.dim, letterSpacing:".5px", marginBottom:5 }}>{d.label}</div>
              <div style={{ fontSize:13.5, fontWeight:700, color:T.text }}>{d.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>Syllabus</div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {exam.syllabus.map((topic,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 13px", background:T.lightCyan, borderRadius:7, border:`1px solid ${T.border}` }}>
              <span style={{ width:20, height:20, borderRadius:5, background:T.accentSoft, color:T.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, flexShrink:0 }}>{i+1}</span>
              <span style={{ fontSize:12.5, fontWeight:500, color:T.text }}>{topic}</span>
              {!isLive && !isUpcoming && <span style={{ marginLeft:"auto", display:"flex", color:T.green }}><Icon.CheckCircle/></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CertLogo({ cert, size = 50 }) {
  const isOracle = cert.orgShort === "Oracle";
  const isAWS    = cert.orgShort === "AWS";
  const isGCP    = cert.orgShort === "GCP";
  return (
    <div style={{ width:size, height:size, borderRadius: size > 55 ? 14 : 11, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.08)", flexShrink:0 }}>
      {isOracle && <svg width={size*.52} height={size*.52} viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="44" ry="28" fill="none" stroke="#ea580c" strokeWidth="10"/></svg>}
      {isAWS    && <svg width={size*.52} height={size*.28} viewBox="0 0 100 50"><text x="2" y="38" fontSize="36" fontWeight="800" fill="#f59e0b" fontFamily="Arial">AWS</text></svg>}
      {isGCP    && <svg width={size*.52} height={size*.52} viewBox="0 0 100 100"><path d="M50 20 L80 80 L20 80 Z" fill="none" stroke="#4285f4" strokeWidth="8"/><circle cx="50" cy="20" r="8" fill="#ea4335"/><circle cx="80" cy="80" r="8" fill="#fbbc05"/><circle cx="20" cy="80" r="8" fill="#34a853"/></svg>}
    </div>
  );
}

function CertCard({ cert, onClick, T }) {
  const isScheduled = cert.status === "scheduled";
  return (
    <div className="na-card" style={{ overflow:"hidden", cursor:"pointer", borderLeft:`3px solid ${cert.orgColor}` }}
      onClick={onClick}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 10px 28px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(43,177,168,0.06)"; }}>
      <div style={{ padding:"20px 22px 16px", background:cert.orgBg, borderBottom:`1px solid ${cert.orgColor}22`, display:"flex", alignItems:"center", gap:14, justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <CertLogo cert={cert} size={50} />
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:cert.orgColor+"bb", letterSpacing:".3px", marginBottom:2 }}>{cert.organization}</div>
            <div style={{ fontSize:15.5, fontWeight:800, color:cert.orgColor, letterSpacing:"-.3px" }}>{cert.name}</div>
            <div style={{ fontSize:12, color:cert.orgColor+"99", marginTop:2 }}>{cert.subtitle}</div>
          </div>
        </div>
        {isScheduled ? <span className="na-badge" style={{ background:T.amberSoft, color:T.amber, flexShrink:0 }}><Icon.Calendar/> Scheduled</span>
                     : <span className="na-badge" style={{ background:T.greenSoft, color:T.green, flexShrink:0 }}><Icon.CheckCircle/> Active</span>}
      </div>
      <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:14 }}>
        {isScheduled ? (
          <div style={{ background:T.amberSoft, border:`1px solid ${T.amber}33`, borderRadius:8, padding:"12px 15px" }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:T.amber, letterSpacing:".4px", marginBottom:8 }}>EXAM SCHEDULED</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[{icon:<Icon.Calendar/>,v:cert.examDate},{icon:<Icon.Clock/>,v:cert.examTime},{icon:<Icon.MapPin/>,v:cert.examCenter}].map((r,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ color:T.amber, display:"flex" }}>{r.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="credential-box" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".5px", color:T.dim, marginBottom:3 }}>CREDENTIAL ID</div>
                <div style={{ color:T.text, fontWeight:600, fontSize:12.5 }}>{cert.credentialId}</div>
              </div>
              <span style={{ display:"flex", color:T.dim }}><Icon.Link/></span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              {[{label:"ISSUED",value:cert.issueDate},{label:"EXPIRES",value:cert.expirationDate},{label:"LEVEL",value:cert.level}].map((d,i)=>(
                <div key={i}>
                  <div style={{ fontSize:9.5, fontWeight:700, color:T.dim, letterSpacing:".4px", marginBottom:3 }}>{d.label}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{d.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11.5, fontWeight:600, color:T.muted }}>Exam Score</span>
                <span style={{ fontSize:12, fontWeight:800, color:cert.orgColor }}>{cert.examScore}%</span>
              </div>
              <div style={{ height:5, background:T.border, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${cert.examScore}%`, background:cert.orgColor, borderRadius:4 }}/>
              </div>
            </div>
          </>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {cert.skills.map((s,i)=><span key={i} className="na-tag">{s}</span>)}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4, fontSize:12, fontWeight:600, color:cert.orgColor }}>
          View Details <Icon.ChevronRight/>
        </div>
      </div>
    </div>
  );
}

function CertDetail({ cert, T }) {
  const isScheduled = cert.status === "scheduled";
  return (
    <div className="na-card" style={{ overflow:"hidden" }}>
      <div style={{ padding:"26px 30px", background:cert.orgBg, borderBottom:`1px solid ${cert.orgColor}22`, display:"flex", alignItems:"flex-start", gap:18 }}>
        <CertLogo cert={cert} size={68} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, fontWeight:700, color:cert.orgColor+"bb", letterSpacing:".3px", marginBottom:5 }}>{cert.organization}</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:cert.orgColor, letterSpacing:"-.5px", marginBottom:3 }}>{cert.name}</h1>
          <p style={{ fontSize:13.5, color:cert.orgColor+"aa" }}>{cert.subtitle}</p>
        </div>
        {isScheduled ? <span className="na-badge" style={{ background:T.amberSoft, color:T.amber, fontSize:12 }}><Icon.Calendar/> Scheduled</span>
                     : <span className="na-badge" style={{ background:T.greenSoft, color:T.green, fontSize:12 }}><Icon.CheckCircle/> Active</span>}
      </div>
      <div style={{ padding:"26px 30px", display:"flex", flexDirection:"column", gap:24 }}>
        {isScheduled ? (
          <div style={{ background:T.amberSoft, border:`1px solid ${T.amber}33`, borderRadius:9, padding:"18px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.amber, letterSpacing:".5px", marginBottom:14 }}>UPCOMING EXAM DETAILS</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {[{label:"DATE",value:cert.examDate},{label:"TIME",value:cert.examTime},{label:"EXAM CENTER",value:cert.examCenter}].map((d,i)=>(
                <div key={i} style={{ background:"rgba(255,255,255,.6)", borderRadius:7, padding:"10px 13px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.amber, letterSpacing:".5px", marginBottom:4 }}>{d.label}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:T.text }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="credential-box" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".5px", color:T.dim, marginBottom:4 }}>CREDENTIAL ID</div>
                <div style={{ color:T.text, fontWeight:600, fontSize:13.5 }}>{cert.credentialId}</div>
              </div>
              <button className="na-btn na-btn-ghost na-btn-sm" onClick={()=>window.open(cert.verifyUrl,"_blank")}><Icon.ExternalLink/> Verify</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
              {[{label:"ISSUE DATE",value:cert.issueDate},{label:"EXPIRY DATE",value:cert.expirationDate},{label:"LEVEL",value:cert.level},{label:"EXAM SCORE",value:`${cert.examScore}%`,hi:true}].map((d,i)=>(
                <div key={i} style={{ background:T.lightCyan, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.dim, letterSpacing:".5px", marginBottom:5 }}>{d.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:d.hi?cert.orgColor:T.text }}>{d.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Exam Score</span>
                <span style={{ fontSize:13.5, fontWeight:800, color:cert.orgColor }}>{cert.examScore}%</span>
              </div>
              <div style={{ height:9, background:T.border, borderRadius:5, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${cert.examScore}%`, background:cert.orgColor, borderRadius:5 }}/>
              </div>
            </div>
          </>
        )}
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:11 }}>Covered Skills</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {cert.skills.map((s,i)=>(
              <div key={i} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:7, border:`1px solid ${cert.orgColor}33`, background:cert.orgBg, fontSize:12.5, fontWeight:600, color:cert.orgColor }}>
                <Icon.CheckCircle/> {s}
              </div>
            ))}
          </div>
        </div>
        {!isScheduled && (
          <div style={{ display:"flex", gap:10 }}>
            <button className="na-btn na-btn-primary"><Icon.Download/> Download Certificate</button>
            <button className="na-btn na-btn-ghost"><Icon.Share/> Share</button>
          </div>
        )}
      </div>
    </div>
  );
}