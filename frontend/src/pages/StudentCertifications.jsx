import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout, Icons, THEME as T } from "./Studentdashboard ";

const CERTS = [
  { id: 300, name: "Oracle Certified Professional", subtitle: "Java SE 17 Developer", organization: "Oracle Corporation", orgShort: "Oracle", orgColor: "#c2410c", orgBg: "#fff7ed", credentialId: "OCP-2024-JS17-48291", issueDate: "Feb 12, 2024", expiryDate: "Feb 12, 2027", status: "active",    level: "Professional", score: 91, skills: ["Java SE 17", "OOP Concepts", "Streams & Lambdas", "Concurrency", "Modules"],             verifyUrl: "https://catalog.oracle.com" },
  { id: 301, name: "AWS Certified Solutions Architect", subtitle: "Associate Level",  organization: "Amazon Web Services", orgShort: "AWS",    orgColor: "#1e40af", orgBg: "#eff6ff", credentialId: "AWS-SAA-C03-20240318", issueDate: "Mar 18, 2024", expiryDate: "Mar 18, 2027", status: "active",    level: "Associate",    score: 87, skills: ["EC2 & VPC", "S3 & Storage", "IAM & Security", "Lambda", "RDS & DynamoDB"],              verifyUrl: "https://aws.amazon.com/verification" },
  { id: 302, name: "Google Cloud Associate",           subtitle: "Cloud Engineer",    organization: "Google Cloud",       orgShort: "GCP",    orgColor: "#1967d2", orgBg: "#dbeafe", credentialId: "GCP-ACE-2024-92837",   issueDate: null,           expiryDate: null,           status: "scheduled", level: "Associate",    score: null, examDate: "Apr 20, 2025", examTime: "10:00 AM", examCenter: "Prometric – Chennai", skills: ["Compute Engine", "GKE", "Cloud Storage", "IAM", "Networking"], verifyUrl: null },
];

function OrgLogo({ cert, size = 50 }) {
  const s = size * 0.52;
  return (
    <div style={{ width: size, height: size, borderRadius: size > 55 ? 14 : 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
      {cert.orgShort === "Oracle" && <svg width={s} height={s} viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="44" ry="28" fill="none" stroke="#ea580c" strokeWidth="10" /></svg>}
      {cert.orgShort === "AWS"    && <svg width={s} height={s * 0.55} viewBox="0 0 100 55"><text x="2" y="42" fontSize="36" fontWeight="800" fill="#f59e0b" fontFamily="Arial">AWS</text></svg>}
      {cert.orgShort === "GCP"    && <svg width={s} height={s} viewBox="0 0 100 100"><path d="M50 20 L80 80 L20 80 Z" fill="none" stroke="#4285f4" strokeWidth="8" /><circle cx="50" cy="20" r="8" fill="#ea4335" /><circle cx="80" cy="80" r="8" fill="#fbbc05" /><circle cx="20" cy="80" r="8" fill="#34a853" /></svg>}
    </div>
  );
}

function CertCard({ cert, onClick }) {
  const isSched = cert.status === "scheduled";
  return (
    <div className="na-card" style={{ overflow: "hidden", cursor: "pointer", borderLeft: `3px solid ${cert.orgColor}` }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(43,177,168,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ padding: "20px 22px 16px", background: cert.orgBg, borderBottom: `1px solid ${cert.orgColor}22`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <OrgLogo cert={cert} size={50} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cert.orgColor + "bb", marginBottom: 2 }}>{cert.organization}</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: cert.orgColor, letterSpacing: "-.3px" }}>{cert.name}</div>
            <div style={{ fontSize: 12, color: cert.orgColor + "99", marginTop: 2 }}>{cert.subtitle}</div>
          </div>
        </div>
        {isSched
          ? <span className="na-badge" style={{ background: T.amberSoft, color: T.amber, flexShrink: 0 }}><Icons.Calendar /> Scheduled</span>
          : <span className="na-badge" style={{ background: T.greenSoft, color: T.green, flexShrink: 0 }}><Icons.CheckCircle /> Active</span>}
      </div>
      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {isSched ? (
          <div style={{ background: T.amberSoft, border: `1px solid ${T.amber}33`, borderRadius: 8, padding: "12px 15px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.amber, letterSpacing: ".4px", marginBottom: 8 }}>EXAM SCHEDULED</div>
            {[{ icon: <Icons.Calendar />, v: cert.examDate }, { icon: <Icons.Clock />, v: cert.examTime }, { icon: <Icons.MapPin />, v: cert.examCenter }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <span style={{ color: T.amber, display: "flex" }}>{r.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="credential-box" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".5px", color: T.dim, marginBottom: 3 }}>CREDENTIAL ID</div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 12.5 }}>{cert.credentialId}</div>
              </div>
              <span style={{ display: "flex", color: T.dim }}><Icons.Link /></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[{ label: "ISSUED", value: cert.issueDate }, { label: "EXPIRES", value: cert.expiryDate }, { label: "LEVEL", value: cert.level }].map((d, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: T.dim, letterSpacing: ".4px", marginBottom: 3 }}>{d.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{d.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.muted }}>Exam Score</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: cert.orgColor }}>{cert.score}%</span>
              </div>
              <div style={{ height: 5, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${cert.score}%`, background: cert.orgColor, borderRadius: 4 }} />
              </div>
            </div>
          </>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {cert.skills.map((s, i) => <span key={i} className="na-tag">{s}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function StudentCertifications() {
  const navigate = useNavigate();
  const active    = CERTS.filter(c => c.status === "active").length;
  const scheduled = CERTS.filter(c => c.status === "scheduled").length;

  return (
    <StudentLayout activePath="/student-certifications">
      <div style={{ marginBottom: 22 }}>
        <button className="na-back" style={{ marginBottom: 10 }} onClick={() => navigate("/student-dashboard")}><Icons.ChevronLeft /> Dashboard</button>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: T.text, letterSpacing: "-.5px", marginBottom: 3 }}>Certifications</h1>
        <p style={{ fontSize: 13, color: T.muted }}>Industry credentials and professional certifications</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[{ label: "Active Certs", value: active, color: T.green }, { label: "Scheduled Exams", value: scheduled, color: T.amber }, { label: "Total", value: CERTS.length, color: T.accent }].map((s, i) => (
          <div key={i} className="na-card" style={{ padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.muted }}>{s.label}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
        {CERTS.map(cert => <CertCard key={cert.id} cert={cert} onClick={() => {}} />)}
      </div>
    </StudentLayout>
  );
}