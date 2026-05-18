
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CertSelect         from "../components/certExam/CertSelect";
import CertIdentityVerify from "../components/certExam/CertIdentityVerify";
import CertExamPortal     from "../components/certExam/CertExamPortal";
import CertExamReport     from "../components/certExam/CertExamReport";

export default function CertVerifyFlow() {
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state || {};
  const initialCert   = locationState.cert      || null;
  const skipSelect    = locationState.skipSelect || false;

  const [step,         setStep]         = useState(skipSelect ? "verify" : "select");
  const [selectedCert, setSelectedCert] = useState(initialCert);
  const [examData,     setExamData]     = useState(null);
  const [reportData,   setReportData]   = useState(null);

  if (step === "select")
    return (
      <CertSelect
        onNext={(cert) => { setSelectedCert(cert); setStep("verify"); }}
      />
    );

  if (step === "verify")
    return (
      <CertIdentityVerify
        cert={selectedCert}
        onNext={(data) => { setExamData(data); setStep("exam"); }}
        onBack={() => skipSelect ? navigate("/student-certifications") : setStep("select")}
      />
    );

  if (step === "exam")
    return (
      <CertExamPortal
        examData={examData}
        cert={selectedCert}
        onFinish={(result) => { setReportData(result); setStep("report"); }}
      />
    );

  if (step === "report")
    return (
      <CertExamReport
        reportData={reportData}
        cert={selectedCert}
        onDone={() => navigate("/student-certifications")}
      />
    );

  return null;
}
