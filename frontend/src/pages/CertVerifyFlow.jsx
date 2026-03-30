// frontend/src/pages/CertVerifyFlow.jsx
// Master orchestrator — renders the correct step component
import { useState } from "react";
import CertSelect from "../components/certExam/CertSelect";
import CertIdentityVerify from "../components/certExam/CertIdentityVerify";
import CertExamPortal from "../components/certExam/CertExamPortal";
import CertExamReport from "../components/certExam/CertExamReport";

const STEPS = ["select", "verify", "exam", "report"];

export default function CertVerifyFlow() {
  const [step, setStep] = useState("select");
  const [selectedCert, setSelectedCert] = useState(null);
  const [examData, setExamData] = useState(null);   // { questions, certName }
  const [reportData, setReportData] = useState(null);

  const go = (s) => setStep(s);

  if (step === "select")
    return (
      <CertSelect
        onNext={(cert) => {
          setSelectedCert(cert);
          go("verify");
        }}
      />
    );

  if (step === "verify")
    return (
      <CertIdentityVerify
        cert={selectedCert}
        onNext={(data) => {
          setExamData(data); // { questions, certName }
          go("exam");
        }}
        onBack={() => go("select")}
      />
    );

  if (step === "exam")
    return (
      <CertExamPortal
        examData={examData}
        cert={selectedCert}
        onFinish={(result) => {
          setReportData(result);
          go("report");
        }}
      />
    );

  if (step === "report")
    return (
      <CertExamReport
        reportData={reportData}
        cert={selectedCert}
        onDone={() => {
          setStep("select");
          setSelectedCert(null);
          setExamData(null);
          setReportData(null);
        }}
      />
    );

  return null;
}
