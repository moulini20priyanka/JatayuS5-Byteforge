import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ── Theme ── */
const C = {
  bg:           "#CFF4F7",
  sidebar:      "#F2FBFF",
  border:       "#b8eaee",
  text:         "#0A2A41",
  muted:        "#3d6878",
  dim:          "#7aacba",
  primary:      "#2BB1A8",
  primaryLight: "#d9f2f4",
  primaryHover: "#1d9e96",
  success:      "#0a8f5c",
  successLight: "#d9f5ec",
  danger:       "#dc2626",
  dangerLight:  "#fee2e2",
  warning:      "#b45309",
  warningLight: "#fef3c7",
  navy:         "#0A2A41",
  paleAqua:     "#CFF4F7",
  lightCyan:    "#F2FBFF",
  white:        "#ffffff",
};

const EXAM_TYPES = { SKILL_CERTIFICATE: "Skill Certificate", PLACEMENT: "Placement" };

const SIDEBAR_MENU = [
  { id: "dashboard",     label: "Dashboard",     icon: "📊" },
  { id: "candidates",    label: "Candidates",     icon: "👥" },
  { id: "reports",       label: "Reports",        icon: "📈" },
  { id: "exam-requests", label: "Exam Requests",  icon: "📋" },
];

const DETAILED_REPORTS = [
  { examName: "Skill Certificate", totalQuestions: 50, duration: "120 mins", difficulty: "Intermediate", avgScore: 78.5, passRate: 85, topics: ["HTML/CSS", "JavaScript", "React", "UI/UX"], questionsBreakdown: [{ topic: "React Concepts", correct: 18, total: 20, percentage: 90 }, { topic: "JavaScript ES6+", correct: 15, total: 18, percentage: 83 }, { topic: "CSS & Styling", correct: 12, total: 15, percentage: 80 }, { topic: "DOM Manipulation", correct: 14, total: 17, percentage: 82 }], completionTime: "98 mins", topPerformers: ["Raj Kumar (92%)", "Vikram Singh (88%)"], commonMistakes: ["Event handling", "State management"] },
  { examName: "Placement", totalQuestions: 45, duration: "110 mins", difficulty: "Advanced", avgScore: 72.3, passRate: 75, topics: ["Node.js", "Express", "MongoDB", "APIs"], questionsBreakdown: [{ topic: "Express.js", correct: 15, total: 18, percentage: 83 }, { topic: "MongoDB Queries", correct: 12, total: 15, percentage: 80 }, { topic: "RESTful APIs", correct: 13, total: 16, percentage: 81 }, { topic: "Authentication", correct: 10, total: 14, percentage: 71 }], completionTime: "105 mins", topPerformers: ["Amit Patel (89%)", "Priya Singh (86%)"], commonMistakes: ["Async/await patterns", "Middleware implementation"] },
];

const REPORTS_DATA = [
  { examName: "Frontend Engineer", totalQuestions: 50, duration: "120 mins", difficulty: "Intermediate", avgScore: 78.5, passRate: 85, topics: ["HTML/CSS", "JavaScript", "React", "UI/UX"], questionsBreakdown: [{ topic: "React Concepts", correct: 18, total: 20, percentage: 90 }, { topic: "JavaScript ES6+", correct: 15, total: 18, percentage: 83 }, { topic: "CSS & Styling", correct: 12, total: 15, percentage: 80 }, { topic: "DOM Manipulation", correct: 14, total: 17, percentage: 82 }], completionTime: "98 mins", topPerformers: ["Raj Kumar (92%)", "Vikram Singh (88%)"], commonMistakes: ["Event handling", "State management"] },
  { examName: "Backend Node.js", totalQuestions: 45, duration: "110 mins", difficulty: "Advanced", avgScore: 72.3, passRate: 75, topics: ["Node.js", "Express", "MongoDB", "APIs"], questionsBreakdown: [{ topic: "Express.js", correct: 15, total: 18, percentage: 83 }, { topic: "MongoDB Queries", correct: 12, total: 15, percentage: 80 }, { topic: "RESTful APIs", correct: 13, total: 16, percentage: 81 }, { topic: "Authentication", correct: 10, total: 14, percentage: 71 }], completionTime: "105 mins", topPerformers: ["Amit Patel (89%)", "Priya Singh (86%)"], commonMistakes: ["Async/await patterns", "Middleware implementation"] },
  { examName: "Full Stack Developer", totalQuestions: 60, duration: "150 mins", difficulty: "Advanced", avgScore: 75.8, passRate: 80, topics: ["Frontend", "Backend", "Database", "DevOps"], questionsBreakdown: [{ topic: "Frontend Stack", correct: 22, total: 25, percentage: 88 }, { topic: "Backend Development", correct: 19, total: 23, percentage: 83 }, { topic: "Database Design", correct: 15, total: 18, percentage: 83 }, { topic: "DevOps & Deployment", correct: 12, total: 15, percentage: 80 }], completionTime: "142 mins", topPerformers: ["Neha Gupta (91%)", "Raj Kumar (89%)"], commonMistakes: ["Database optimization", "Container orchestration"] },
];

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [analysisReports, setAnalysisReports] = useState([]);
  const [selectedCriteria, setSelectedCriteria] = useState(70);
  const [selectedExamType, setSelectedExamType] = useState("ALL");
  const [filteredStudents, setFilteredStudents] = useState({});
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examRequestForm, setExamRequestForm] = useState({ jobRole: "", assessmentPattern: "", duration: "", specifications: "" });
  const [selectedReportIndex, setSelectedReportIndex] = useState(null);
  const [selectedDashboardReportIndex, setSelectedDashboardReportIndex] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({ totalStudents: 0, qualified: 0, notQualified: 0, byExamType: {} });

  useEffect(() => {
    setAnalysisReports([
      { id: 1, studentName: "Raj Kumar", email: "raj@example.com", examType: EXAM_TYPES.SKILL_CERTIFICATE, marks: 85, totalMarks: 100, percentage: 85, status: "Completed" },
      { id: 2, studentName: "Priya Singh", email: "priya@example.com", examType: EXAM_TYPES.PLACEMENT, marks: 78, totalMarks: 100, percentage: 78, status: "Completed" },
      { id: 3, studentName: "Amit Patel", email: "amit@example.com", examType: EXAM_TYPES.PLACEMENT, marks: 92, totalMarks: 100, percentage: 92, status: "Completed" },
      { id: 4, studentName: "Anjali Verma", email: "anjali@example.com", examType: EXAM_TYPES.SKILL_CERTIFICATE, marks: 65, totalMarks: 100, percentage: 65, status: "Completed" },
      { id: 5, studentName: "Vikram Singh", email: "vikram@example.com", examType: EXAM_TYPES.SKILL_CERTIFICATE, marks: 88, totalMarks: 100, percentage: 88, status: "Completed" },
      { id: 6, studentName: "Neha Gupta", email: "neha@example.com", examType: EXAM_TYPES.PLACEMENT, marks: 75, totalMarks: 100, percentage: 75, status: "Completed" },
    ]);
  }, []);

  useEffect(() => {
    let filtered = analysisReports;
    if (selectedExamType !== "ALL") filtered = filtered.filter(r => r.examType === selectedExamType);
    const qualified    = filtered.filter(r => r.percentage >= selectedCriteria);
    const notQualified = filtered.filter(r => r.percentage < selectedCriteria);
    setFilteredStudents({ qualified, notQualified });

    const byExamType = {};
    Object.values(EXAM_TYPES).forEach(type => {
      const typeReports = analysisReports.filter(r => r.examType === type);
      byExamType[type] = {
        total: typeReports.length,
        qualified: typeReports.filter(r => r.percentage >= selectedCriteria).length,
        avg: typeReports.length > 0 ? (typeReports.reduce((s, r) => s + r.percentage, 0) / typeReports.length).toFixed(2) : 0,
      };
    });
    setDashboardStats({ totalStudents: analysisReports.length, qualified: qualified.length, notQualified: notQualified.length, byExamType });
  }, [analysisReports, selectedCriteria, selectedExamType]);

  const s = styles(C);

  const DetailedReport = ({ report, onBack }) => (
    <div>
      <button style={s.backBtn} onClick={onBack}>← Back</button>
      <div style={s.detailedReportCard}>
        <div style={s.reportHeader}>
          <div>
            <h4 style={s.reportTitle}>{report.examName}</h4>
            <p style={s.reportMeta}>{report.totalQuestions} Questions | {report.duration} | {report.difficulty}</p>
          </div>
          <div style={s.reportStats}>
            <div style={s.reportStat}><span style={s.reportStatLabel}>Avg Score</span><span style={s.reportStatValue}>{report.avgScore}%</span></div>
            <div style={s.reportStat}><span style={s.reportStatLabel}>Pass Rate</span><span style={{ ...s.reportStatValue, color: C.success }}>{report.passRate}%</span></div>
          </div>
        </div>
        <div style={s.reportBody}>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Topics Covered</h5>
            <div style={s.topicsList}>{report.topics.map((t, i) => <span key={i} style={s.topicTag}>{t}</span>)}</div>
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Performance by Topic</h5>
            {report.questionsBreakdown.map((item, i) => (
              <div key={i} style={s.breakdownItem}>
                <div style={s.breakdownLabel}><span style={s.breakdownTopic}>{item.topic}</span><span style={s.breakdownScore}>{item.correct}/{item.total}</span></div>
                <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${item.percentage}%`, backgroundColor: item.percentage >= 85 ? C.success : item.percentage >= 70 ? C.primary : C.danger }}></div></div>
                <span style={s.percentageText}>{item.percentage}%</span>
              </div>
            ))}
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Top Performers</h5>
            <ul style={s.performersList}>{report.topPerformers.map((p, i) => <li key={i} style={s.performerItem}>🏆 {p}</li>)}</ul>
          </div>
          <div style={s.reportSection}>
            <h5 style={s.reportSectionTitle}>Common Mistakes</h5>
            <ul style={s.mistakesList}>{report.commonMistakes.map((m, i) => <li key={i} style={s.mistakeItem}>⚠️ {m}</li>)}</ul>
          </div>
          <div style={s.quickStatsRow}>
            <div style={s.quickStat}><span style={s.quickStatLabel}>Completion Time</span><span style={s.quickStatValue}>{report.completionTime}</span></div>
            <div style={s.quickStat}><span style={s.quickStatLabel}>Avg Duration</span><span style={s.quickStatValue}>{report.duration}</span></div>
          </div>
        </div>
        <div style={s.reportFooter}>
          <button style={s.reportBtn}>📥 Download Full Report</button>
          <button style={{ ...s.reportBtn, backgroundColor: C.navy }}>📤 Share Report</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.mainContainer}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: ${C.bg}; }
        .rec-nav-item:hover { background: ${C.primaryLight} !important; color: ${C.primary} !important; }
        .rec-nav-active { background: ${C.primaryLight} !important; color: ${C.primary} !important; border-left: 3px solid ${C.primary} !important; }
        .rec-tr:hover { background: ${C.lightCyan} !important; }
        .rec-criteria-btn:hover { background: ${C.primaryLight}; color: ${C.primary}; border-color: ${C.primary}; }
        .rec-btn-primary:hover { background: ${C.primaryHover} !important; transform: translateY(-1px); }
        .rec-stat-card:hover { box-shadow: 0 6px 18px rgba(43,177,168,0.15) !important; }
      `}</style>

      {/* Sidebar */}
      <div style={{ ...s.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={s.sidebarHeader}>
          <div style={s.logo}>
            <div style={s.logoBadge}>NA</div>
            <div style={s.logoText}>
              <h3 style={s.logoTitle}>NeuroAssess</h3>
              <p style={s.logoSubtitle}>Recruiter Portal</p>
            </div>
          </div>
        </div>
        <nav style={s.sidebarNav}>
          <p style={s.navSectionTitle}>MAIN</p>
          {SIDEBAR_MENU.map(item => (
            <button key={item.id}
              className={`rec-nav-item${activeMenu === item.id ? " rec-nav-active" : ""}`}
              style={s.navItem}
              onClick={() => setActiveMenu(item.id)}>
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={s.sidebarFooter}>
          <button style={s.logoutButton} onClick={() => navigate("/")}>🚪 Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={s.contentWrapper}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div>
              <h1 style={s.pageTitle}>
                {activeMenu === "dashboard" && "Dashboard"}
                {activeMenu === "candidates" && "Candidates"}
                {activeMenu === "reports" && "Reports"}
                {activeMenu === "exam-requests" && "Exam Requests"}
              </h1>
              <p style={s.pageSubtitle}>Overview of your ongoing recruitment drives and candidates</p>
            </div>
          </div>
          <div style={s.headerRight}>
            <div style={s.welcomeText}>Welcome, Jane Doe</div>
            <div style={s.avatarCircle}>JD</div>
          </div>
        </header>

        {/* Content */}
        <div style={s.content}>

          {/* ── DASHBOARD ── */}
          {activeMenu === "dashboard" && (
            <>
              {selectedDashboardReportIndex !== null ? (
                <DetailedReport report={DETAILED_REPORTS[selectedDashboardReportIndex]} onBack={() => setSelectedDashboardReportIndex(null)} />
              ) : (
                <>
                  {/* Filters */}
                  <div style={s.filterSection}>
                    <div style={s.filterCard}>
                      <label style={s.label}>Qualification Criteria</label>
                      <div style={s.criteriaButtons}>
                        {[70, 75, 80].map(c => (
                          <button key={c} className="rec-criteria-btn"
                            style={{ ...s.criteriaBtn, backgroundColor: selectedCriteria === c ? C.primary : C.lightCyan, color: selectedCriteria === c ? "#fff" : C.text, borderColor: selectedCriteria === c ? C.primary : C.border }}
                            onClick={() => setSelectedCriteria(c)}>{c}%</button>
                        ))}
                      </div>
                    </div>
                    <div style={s.filterCard}>
                      <label style={s.label}>Filter by Exam Type</label>
                      <select style={s.select} value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                        <option value="ALL">All Exams</option>
                        {Object.values(EXAM_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={s.statsGrid}>
                    {[
                      { label: "Total Assessed", value: dashboardStats.totalStudents, color: C.primary, borderColor: C.primary, icon: "📊" },
                      { label: "Shortlisted Candidates", value: dashboardStats.qualified, color: C.success, borderColor: C.success, icon: "✓" },
                      { label: "Pending Interviews", value: dashboardStats.notQualified, color: C.warning, borderColor: C.warning, icon: "⏱️" },
                    ].map((stat, i) => (
                      <div key={i} className="rec-stat-card" style={{ ...s.statCard, borderLeftColor: stat.borderColor }}>
                        <div style={s.statCardContent}>
                          <p style={s.statLabel}>{stat.label}</p>
                          <h2 style={{ ...s.statValue, color: stat.color }}>{stat.value}</h2>
                        </div>
                        <div style={s.statIcon}>{stat.icon}</div>
                      </div>
                    ))}
                  </div>

                  {/* Exam type stats */}
                  <div style={s.section}>
                    <h2 style={s.sectionTitle}>Statistics by Exam Type</h2>
                    <div style={s.examStatsGrid}>
                      {Object.entries(dashboardStats.byExamType).map(([type, stats], idx) => (
                        <div key={type} style={s.examStatCard}>
                          <h4 style={s.examTypeTitle}>{type}</h4>
                          {[["Total", stats.total, C.text], ["Qualified", stats.qualified, C.success], ["Average", `${stats.avg}%`, C.primary]].map(([label, val, col], i) => (
                            <div key={i} style={s.examStatDetail}>
                              <span style={{ color: C.muted }}>{label}</span>
                              <span style={{ fontWeight: 700, color: col }}>{val}</span>
                            </div>
                          ))}
                          <button style={s.viewReportBtn} onClick={() => setSelectedDashboardReportIndex(idx)}>View Detailed Report</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div style={s.section}>
                    <h2 style={s.sectionTitle}>Recent Activity</h2>
                    <div style={s.activityList}>
                      {[
                        { text: "Exam request 'Frontend Engineer' approved by Admin.", time: "2 hours ago" },
                        { text: "15 new candidates completed the 'Backend Node.js' assessment.", time: "5 hours ago" },
                        { text: "Interview scheduled with candidate Alex Johnson for tomorrow.", time: "1 day ago" },
                      ].map((a, idx) => (
                        <div key={idx} style={{ ...s.activityItem, borderBottom: idx < 2 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ ...s.activityDot, backgroundColor: C.primary }}></div>
                          <div style={s.activityContent}>
                            <p style={s.activityText}>{a.text}</p>
                            <span style={s.activityTime}>{a.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── CANDIDATES ── */}
          {activeMenu === "candidates" && (
            <>
              <div style={s.filterSection}>
                <div style={s.filterCard}>
                  <label style={s.label}>Qualification Criteria</label>
                  <div style={s.criteriaButtons}>
                    {[70, 75, 80].map(c => (
                      <button key={c} className="rec-criteria-btn"
                        style={{ ...s.criteriaBtn, backgroundColor: selectedCriteria === c ? C.primary : C.lightCyan, color: selectedCriteria === c ? "#fff" : C.text, borderColor: selectedCriteria === c ? C.primary : C.border }}
                        onClick={() => setSelectedCriteria(c)}>{c}%</button>
                    ))}
                  </div>
                </div>
                <div style={s.filterCard}>
                  <label style={s.label}>Filter by Exam Type</label>
                  <select style={s.select} value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                    <option value="ALL">All Exams</option>
                    {Object.values(EXAM_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.statsGrid}>
                {[
                  { label: "Total Candidates", value: dashboardStats.totalStudents, color: C.primary, borderColor: C.primary, icon: "👥" },
                  { label: "Shortlisted", value: dashboardStats.qualified, color: C.success, borderColor: C.success, icon: "⭐" },
                  { label: "Not Qualified", value: dashboardStats.notQualified, color: C.danger, borderColor: C.danger, icon: "⚠️" },
                ].map((stat, i) => (
                  <div key={i} className="rec-stat-card" style={{ ...s.statCard, borderLeftColor: stat.borderColor }}>
                    <div style={s.statCardContent}><p style={s.statLabel}>{stat.label}</p><h2 style={{ ...s.statValue, color: stat.color }}>{stat.value}</h2></div>
                    <div style={s.statIcon}>{stat.icon}</div>
                  </div>
                ))}
              </div>

              {/* Shortlisted */}
              <div style={s.section}>
                <h2 style={{ ...s.sectionTitle, color: C.success }}>✓ Shortlisted Candidates (≥{selectedCriteria}%)</h2>
                {filteredStudents.qualified?.length > 0 ? (
                  <div style={s.tableWrapper}>
                    <table style={s.table}>
                      <thead><tr style={s.tableHeader}>{["Candidate Name","Email","Exam Type","Score","Percentage","Action"].map((h,i) => <th key={i} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredStudents.qualified.map(student => (
                          <tr key={student.id} className="rec-tr" style={s.tableRow}>
                            <td style={s.td}>{student.studentName}</td>
                            <td style={s.td}>{student.email}</td>
                            <td style={s.td}><span style={{ ...s.badge, background: C.primaryLight, color: C.primary }}>{student.examType}</span></td>
                            <td style={s.td}>{student.marks}/{student.totalMarks}</td>
                            <td style={s.td}><span style={{ ...s.percentBadge, backgroundColor: C.successLight, color: C.success }}>{student.percentage}%</span></td>
                            <td style={s.td}><button style={s.actionBtn} onClick={() => { setSelectedStudent(student); setShowGoogleForm(true); }}>Schedule Interview</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={s.noData}>No shortlisted candidates found</p>}
              </div>

              {/* Not qualified */}
              <div style={s.section}>
                <h2 style={{ ...s.sectionTitle, color: C.warning }}>⚠️ Review Candidates (Less than {selectedCriteria}%)</h2>
                {filteredStudents.notQualified?.length > 0 ? (
                  <div style={s.tableWrapper}>
                    <table style={s.table}>
                      <thead><tr style={s.tableHeader}>{["Candidate Name","Email","Exam Type","Score","Percentage","Action"].map((h,i) => <th key={i} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredStudents.notQualified.map(student => (
                          <tr key={student.id} className="rec-tr" style={s.tableRow}>
                            <td style={s.td}>{student.studentName}</td>
                            <td style={s.td}>{student.email}</td>
                            <td style={s.td}><span style={{ ...s.badge, background: C.primaryLight, color: C.primary }}>{student.examType}</span></td>
                            <td style={s.td}>{student.marks}/{student.totalMarks}</td>
                            <td style={s.td}><span style={{ ...s.percentBadge, backgroundColor: C.dangerLight, color: C.danger }}>{student.percentage}%</span></td>
                            <td style={s.td}><button style={{ ...s.actionBtn, backgroundColor: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}44` }}>Request Retake</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={s.noData}>No review candidates found</p>}
              </div>
            </>
          )}

          {/* ── REPORTS ── */}
          {activeMenu === "reports" && (
            <>
              <div style={{ ...s.filterCard, marginBottom: "30px" }}>
                <label style={s.label}>Filter by Exam Type</label>
                <select style={s.select} value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
                  <option value="ALL">All Exams</option>
                  {Object.values(EXAM_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={s.examStatsGrid}>
                {Object.entries(dashboardStats.byExamType).map(([type, stats]) => (
                  <div key={type} style={s.examReportCard}>
                    <div style={{ ...s.examReportHeader, background: C.primaryLight }}>
                      <h4 style={{ ...s.examReportTitle, color: C.primary }}>{type}</h4>
                      <span style={{ ...s.examReportBadge, background: C.primary, color: "#fff" }}>{stats.total} Candidates</span>
                    </div>
                    <div style={s.examReportContent}>
                      {[["Total Assessments", stats.total, C.text], ["Pass Rate", `${stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0}%`, C.success], ["Average Score", `${stats.avg}%`, C.primary]].map(([label, val, col], i) => (
                        <div key={i} style={s.examReportMetric}>
                          <span style={s.metricLabel}>{label}</span>
                          <span style={{ ...s.metricValue, color: col }}>{val}</span>
                        </div>
                      ))}
                      <button style={s.viewReportBtn}>View Detailed Report</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending requests */}
              <div style={s.section}>
                <h2 style={s.sectionTitle}>Pending Exam Requests</h2>
                <div style={s.requestsList}>
                  {[
                    { exam: "Frontend Engineer", status: "Approved", date: "2 days ago", candidates: 12 },
                    { exam: "Backend Node.js", status: "Pending", date: "3 days ago", candidates: 8 },
                    { exam: "Full Stack Developer", status: "Approved", date: "1 week ago", candidates: 15 },
                  ].map((req, idx) => (
                    <div key={idx} style={s.requestCard}>
                      <div><h5 style={s.requestTitle}>{req.exam}</h5><span style={s.requestMeta}>{req.candidates} candidates | Requested {req.date}</span></div>
                      <span style={{ ...s.requestStatus, backgroundColor: req.status === "Approved" ? C.successLight : C.warningLight, color: req.status === "Approved" ? C.success : C.warning }}>{req.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed reports */}
              <div style={s.section}>
                <h2 style={s.sectionTitle}>Detailed Exam Reports</h2>
                {selectedReportIndex === null ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {REPORTS_DATA.map((report, idx) => (
                      <div key={idx} style={s.examReportListItem}>
                        <div style={s.examReportListHeader}>
                          <div>
                            <h4 style={s.examReportListTitle}>{report.examName}</h4>
                            <p style={s.examReportListMeta}>{report.totalQuestions} Questions | {report.duration} | {report.difficulty}</p>
                          </div>
                          <div style={{ display: "flex", gap: 20, textAlign: "right" }}>
                            <div><div style={{ fontSize: 11, color: C.dim, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase" }}>Avg Score</div><div style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{report.avgScore}%</div></div>
                            <div><div style={{ fontSize: 11, color: C.dim, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase" }}>Pass Rate</div><div style={{ fontSize: 20, fontWeight: 700, color: C.success }}>{report.passRate}%</div></div>
                          </div>
                        </div>
                        <button style={s.viewReportBtn} onClick={() => setSelectedReportIndex(idx)}>View Detailed Report</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DetailedReport report={REPORTS_DATA[selectedReportIndex]} onBack={() => setSelectedReportIndex(null)} />
                )}
              </div>

              {/* Analytics */}
              <div style={s.section}>
                <h2 style={s.sectionTitle}>Detailed Exam Analytics</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                  {[
                    { label: "Highest Score", value: "98%", color: C.success, lightColor: C.successLight, description: "Outstanding Performance" },
                    { label: "Lowest Score", value: "45%", color: C.danger, lightColor: C.dangerLight, description: "Needs Support" },
                    { label: "Average Duration", value: "45 mins", color: C.primary, lightColor: C.primaryLight, description: "Exam Completion Time" },
                    { label: "Completion Rate", value: "94%", color: C.navy, lightColor: "#d9eaf5", description: "Test Completion" },
                  ].map((stat, idx) => (
                    <div key={idx} style={{ background: C.white, padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center", boxShadow: `0 1px 3px rgba(43,177,168,0.06)` }}>
                      <div style={{ width: 60, height: 60, borderRadius: 12, background: stat.lightColor, borderLeft: `4px solid ${stat.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: stat.color }}></div>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600, color: C.dim, textTransform: "uppercase", letterSpacing: ".5px" }}>{stat.label}</p>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: C.dim, fontStyle: "italic" }}>{stat.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── EXAM REQUESTS ── */}
          {activeMenu === "exam-requests" && (
            <div style={s.examRequestsContainer}>
              <div style={s.examRequestsLeft}>
                <h2 style={s.sectionTitle}>New Exam Request</h2>
                <div style={{ marginTop: 20 }}>
                  {[
                    { label: "Target Job Role", field: "jobRole", type: "text", placeholder: "e.g., Senior Full Stack Engineer" },
                  ].map(({ label, field, type, placeholder }) => (
                    <div key={field} style={s.formGroup}>
                      <label style={s.formLabel}>{label}</label>
                      <input type={type} placeholder={placeholder} style={s.formInput} value={examRequestForm[field]} onChange={e => setExamRequestForm({ ...examRequestForm, [field]: e.target.value })} />
                    </div>
                  ))}
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Assessment Pattern</label>
                    <select style={s.formInput} value={examRequestForm.assessmentPattern} onChange={e => setExamRequestForm({ ...examRequestForm, assessmentPattern: e.target.value })}>
                      <option value="">Select modules</option>
                      <option value="technical">Technical Skills</option>
                      <option value="behavioral">Behavioral Assessment</option>
                      <option value="aptitude">Aptitude Test</option>
                      <option value="combined">Combined Assessment</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Total Duration (minutes)</label>
                    <input type="number" placeholder="e.g., 120" style={s.formInput} value={examRequestForm.duration} onChange={e => setExamRequestForm({ ...examRequestForm, duration: e.target.value })} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Additional Specifications</label>
                    <textarea placeholder="e.g., Require strict proctoring..." style={{ ...s.formInput, minHeight: "100px", fontFamily: "inherit" }} value={examRequestForm.specifications} onChange={e => setExamRequestForm({ ...examRequestForm, specifications: e.target.value })} />
                  </div>
                  <button style={s.submitBtn}>📝 Submit Request</button>
                </div>
              </div>

              <div style={s.examRequestsRight}>
                <h2 style={s.sectionTitle}>Recent Requests History</h2>
                <div style={{ marginTop: 20, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ backgroundColor: C.lightCyan, borderBottom: `2px solid ${C.border}` }}>
                        {["Request ID","Job Role","Exam Pattern","Duration (mins)","Date Requested","Status"].map((h, i) => (
                          <th key={i} style={{ padding: 12, textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: "REQ-001", role: "Frontend Developer", pattern: "Aptitude + Coding", duration: 90, date: "2023-10-12", status: "APPROVED" },
                        { id: "REQ-002", role: "Data Scientist", pattern: "Python + Statistics", duration: 120, date: "2023-10-14", status: "PENDING" },
                        { id: "REQ-003", role: "DevOps Engineer", pattern: "Cloud Infrastructure", duration: 100, date: "2023-10-15", status: "APPROVED" },
                      ].map((req, idx) => (
                        <tr key={idx} className="rec-tr" style={{ borderBottom: `1px solid ${C.border}` }}>
                          {[req.id, req.role, req.pattern, req.duration, req.date].map((v, i) => <td key={i} style={{ ...s.td, fontSize: 12 }}>{v}</td>)}
                          <td style={{ ...s.td, fontSize: 12 }}>
                            <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, display: "inline-block", backgroundColor: req.status === "APPROVED" ? C.successLight : C.warningLight, color: req.status === "APPROVED" ? C.success : C.warning }}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── MODAL ── */}
          {showGoogleForm && selectedStudent && (
            <div style={s.modalOverlay} onClick={() => setShowGoogleForm(false)}>
              <div style={s.modalContent} onClick={e => e.stopPropagation()}>
                <div style={s.modalHeader}>
                  <h2 style={s.modalTitle}>Schedule Interview — {selectedStudent.studentName}</h2>
                  <button style={s.closeBtn} onClick={() => setShowGoogleForm(false)}>✕</button>
                </div>
                <div style={s.modalBody}>
                  <div style={{ background: C.lightCyan, padding: 16, borderRadius: 8, marginBottom: 24, border: `1px solid ${C.border}` }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Candidate Details</h4>
                    {[["Name", selectedStudent.studentName], ["Email", selectedStudent.email], ["Score", `${selectedStudent.percentage}%`], ["Exam Type", selectedStudent.examType]].map(([label, val], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: C.muted }}>{label}:</span>
                        <span style={{ color: C.text }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700, color: C.text }}>Interview Scheduling Form</h4>
                    <p style={{ margin: "0 0 16px 0", fontSize: 12, color: C.dim }}>Google Form will open in a new tab to schedule the interview</p>
                    <div style={{ marginBottom: 20 }}>
                      {[{ label: "Interview Date", type: "date" }, { label: "Interview Time", type: "time" }].map(({ label, type }) => (
                        <div key={type} style={s.formGroup}><label style={s.formLabel}>{label}</label><input type={type} style={s.formInput} /></div>
                      ))}
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Interview Type</label>
                        <select style={s.formInput}><option>Technical Round</option><option>HR Round</option><option>Final Round</option></select>
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.formLabel}>Interviewer Email</label>
                        <input type="email" placeholder="interviewer@company.com" style={s.formInput} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                      <button style={{ flex: 1, padding: 12, background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => window.open("https://forms.google.com/", "_blank")}>📝 Open Google Form</button>
                      <button style={{ flex: 1, padding: 12, background: C.lightCyan, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => setShowGoogleForm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Styles factory ── */
const styles = (C) => ({
  mainContainer: { display: "flex", minHeight: "100vh", backgroundColor: C.bg, fontFamily: "'DM Sans', -apple-system, sans-serif" },
  sidebar: { width: 280, backgroundColor: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, transition: "transform 0.3s ease", zIndex: 1000 },
  sidebarHeader: { padding: "24px 20px", borderBottom: `1px solid ${C.border}` },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoBadge: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  logoText: { flex: 1 },
  logoTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: C.text },
  logoSubtitle: { margin: "2px 0 0 0", fontSize: 12, color: C.dim },
  sidebarNav: { flex: 1, padding: "20px 0", overflow: "auto" },
  navSectionTitle: { margin: "0 20px 12px 20px", fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.5px" },
  navItem: { width: "100%", padding: "12px 20px", border: "none", backgroundColor: "transparent", color: C.muted, fontSize: 14, fontWeight: 500, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s ease", borderLeft: "3px solid transparent" },
  navIcon: { fontSize: 18 },
  sidebarFooter: { padding: 20, borderTop: `1px solid ${C.border}` },
  logoutButton: { width: "100%", padding: 12, backgroundColor: C.dangerLight, color: C.danger, border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 },
  contentWrapper: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  header: { padding: "20px 40px", backgroundColor: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { display: "flex", alignItems: "center", gap: 20 },
  menuToggle: { backgroundColor: C.lightCyan, border: `1px solid ${C.border}`, padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 20, color: C.primary },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: C.text },
  pageSubtitle: { margin: "4px 0 0 0", fontSize: 13, color: C.muted },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  welcomeText: { fontSize: 14, color: C.muted, fontWeight: 500 },
  avatarCircle: { width: 36, height: 36, borderRadius: "50%", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 },
  content: { padding: "32px 40px", flex: 1 },
  filterSection: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 },
  filterCard: { backgroundColor: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  label: { display: "block", marginBottom: 12, fontSize: 13, fontWeight: 600, color: C.text },
  criteriaButtons: { display: "flex", gap: 10 },
  criteriaBtn: { flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s ease" },
  select: { width: "100%", padding: 10, backgroundColor: C.white, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 32 },
  statCard: { backgroundColor: C.white, padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.primary}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 1px 3px rgba(43,177,168,0.06)`, transition: "box-shadow 0.2s ease" },
  statCardContent: { flex: 1 },
  statLabel: { margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" },
  statValue: { margin: 0, fontSize: 32, fontWeight: 700 },
  statIcon: { fontSize: 32, marginLeft: 16 },
  section: { marginBottom: 32 },
  sectionTitle: { margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: C.text },
  examStatsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 },
  examStatCard: { backgroundColor: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  examTypeTitle: { margin: "0 0 15px 0", fontSize: 14, fontWeight: 700, color: C.text },
  examStatDetail: { display: "flex", justifyContent: "space-between", paddingBottom: 12, fontSize: 13, borderBottom: `1px solid ${C.border}`, marginBottom: 12 },
  tableWrapper: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflowX: "auto", boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  tableHeader: { backgroundColor: C.lightCyan, borderBottom: `2px solid ${C.border}` },
  th: { padding: 16, textAlign: "left", fontWeight: 600, color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" },
  tableRow: { borderBottom: `1px solid ${C.border}`, transition: "background-color 0.2s" },
  td: { padding: 16, color: C.text },
  badge: { padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" },
  percentBadge: { padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "inline-block" },
  noData: { padding: 30, textAlign: "center", color: C.dim, fontSize: 14, backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}` },
  actionBtn: { padding: "6px 16px", backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  activityList: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  activityItem: { display: "flex", gap: 16, paddingBottom: 16, marginBottom: 16 },
  activityDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  activityContent: { flex: 1 },
  activityText: { margin: "0 0 4px 0", fontSize: 14, color: C.text, fontWeight: 500 },
  activityTime: { fontSize: 12, color: C.dim },
  examReportCard: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  examReportHeader: { padding: "16px 20px", backgroundColor: C.lightCyan, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
  examReportTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: C.text },
  examReportBadge: { padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600 },
  examReportContent: { padding: 20 },
  examReportMetric: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 16 },
  metricLabel: { fontSize: 13, color: C.muted, fontWeight: 500 },
  metricValue: { fontSize: 20, fontWeight: 700 },
  viewReportBtn: { width: "100%", padding: 10, backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, marginTop: 16 },
  requestsList: { display: "flex", flexDirection: "column", gap: 12 },
  requestCard: { backgroundColor: C.white, padding: "16px 20px", borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
  requestTitle: { margin: "0 0 6px 0", fontSize: 14, fontWeight: 700, color: C.text },
  requestMeta: { fontSize: 12, color: C.dim },
  requestStatus: { padding: "6px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600, display: "inline-block" },
  examReportListItem: { backgroundColor: C.white, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  examReportListHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  examReportListTitle: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 700, color: C.text },
  examReportListMeta: { margin: 0, fontSize: 12, color: C.dim },
  detailedReportCard: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: `0 4px 6px rgba(43,177,168,0.08)` },
  reportHeader: { padding: 20, backgroundColor: C.lightCyan, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  reportTitle: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 700, color: C.text },
  reportMeta: { margin: 0, fontSize: 12, color: C.dim },
  reportStats: { display: "flex", gap: 20, textAlign: "right" },
  reportStat: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  reportStatLabel: { fontSize: 11, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  reportStatValue: { fontSize: 24, fontWeight: 700, color: C.primary, marginTop: 4 },
  reportBody: { padding: 20 },
  reportSection: { marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` },
  reportSectionTitle: { margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" },
  topicsList: { display: "flex", gap: 8, flexWrap: "wrap" },
  topicTag: { backgroundColor: C.primaryLight, color: C.primary, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  breakdownItem: { marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.lightCyan}` },
  breakdownLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  breakdownTopic: { fontSize: 13, fontWeight: 600, color: C.text },
  breakdownScore: { fontSize: 12, color: C.dim },
  progressBar: { width: "100%", height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", transition: "width 0.3s ease" },
  percentageText: { fontSize: 11, color: C.dim, fontWeight: 600 },
  performersList: { margin: 0, padding: "0 0 0 20px", listStyle: "none" },
  performerItem: { fontSize: 13, color: C.text, marginBottom: 8, fontWeight: 500 },
  mistakesList: { margin: 0, padding: "0 0 0 20px", listStyle: "none" },
  mistakeItem: { fontSize: 13, color: C.text, marginBottom: 8, fontWeight: 500 },
  quickStatsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  quickStat: { display: "flex", flexDirection: "column" },
  quickStatLabel: { fontSize: 11, color: C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  quickStatValue: { fontSize: 16, fontWeight: 700, color: C.text, marginTop: 4 },
  reportFooter: { padding: "16px 20px", backgroundColor: C.lightCyan, borderTop: `1px solid ${C.border}`, display: "flex", gap: 12 },
  reportBtn: { flex: 1, padding: "10px 16px", backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  backBtn: { padding: "10px 16px", backgroundColor: C.lightCyan, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 24 },
  examRequestsContainer: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 30 },
  examRequestsLeft: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  examRequestsRight: { backgroundColor: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, boxShadow: `0 1px 3px rgba(43,177,168,0.06)` },
  formGroup: { marginBottom: 16 },
  formLabel: { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.text },
  formInput: { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.text, boxSizing: "border-box", outline: "none" },
  submitBtn: { width: "100%", padding: 12, backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, marginTop: 20 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,42,65,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  modalContent: { backgroundColor: C.white, borderRadius: 12, maxWidth: 600, width: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(10,42,65,0.2)" },
  modalHeader: { padding: 24, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: C.lightCyan },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: C.text },
  closeBtn: { backgroundColor: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: C.muted, padding: 0, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 24 },
});

export default RecruiterDashboard;