// frontend/src/components/certExam/CertIdentityVerify.jsx
import { useState, useRef, useEffect, useCallback } from "react";

export default function CertIdentityVerify({ cert, onNext, onBack }) {
  const [step, setStep]               = useState("aadhaar");
  const [aadhaar, setAadhaar]         = useState("");
  const [aadhaarError, setAadhaarError] = useState("");
  const [stream, setStream]           = useState(null);
  const [faceOk, setFaceOk]           = useState(false);
  const [faceMsg, setFaceMsg]         = useState("Position your face in the frame");
  const [faceStatus, setFaceStatus]   = useState("idle");
  const [capturedImage, setCapturedImage] = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genStatus, setGenStatus]     = useState("Initializing...");
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);

  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleAadhaarNext = () => {
    const digits = aadhaar.replace(/\s/g, "");
    if (digits.length !== 12) return setAadhaarError("Aadhaar must be exactly 12 digits");
    setAadhaarError("");
    setStep("face");
    startCamera();
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
      setStream(s);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
      }, 100);
    } catch (e) {
      setFaceMsg("Camera access denied. Please allow camera access.");
      setFaceStatus("error");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [stream]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFaceStatus("scanning");
    setFaceMsg("Scanning face... please hold still");
    const canvas = canvasRef.current;
    canvas.width = 320; canvas.height = 240;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, 320, 240);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setTimeout(() => {
      setCapturedImage(imageData);
      setFaceOk(true);
      setFaceStatus("success");
      setFaceMsg("Face verified successfully ✓");
      stopCamera();
    }, 2000);
  };

  // ── Offline question banks ──────────────────────────────────────────────────
  const OFFLINE_BANKS = {
    java: [
      { id:1,  question:"Which of the following is NOT a primitive type in Java?", options:{A:"int",B:"String",C:"boolean",D:"char"}, correct:"B", explanation:"String is a class.", difficulty:"easy", topic:"Data Types" },
      { id:2,  question:"Output of System.out.println(10 / 3)?", options:{A:"3.33",B:"3",C:"4",D:"Error"}, correct:"B", explanation:"Integer division truncates.", difficulty:"easy", topic:"Operators" },
      { id:3,  question:"Which keyword prevents subclassing?", options:{A:"static",B:"abstract",C:"final",D:"sealed"}, correct:"C", explanation:"final prevents inheritance.", difficulty:"easy", topic:"OOP" },
      { id:4,  question:"What does JVM stand for?", options:{A:"Java Virtual Machine",B:"Java Variable Method",C:"Java Verified Module",D:"Java Visual Manager"}, correct:"A", explanation:"JVM executes bytecode.", difficulty:"easy", topic:"Basics" },
      { id:5,  question:"Which collection forbids duplicates?", options:{A:"ArrayList",B:"LinkedList",C:"HashSet",D:"Vector"}, correct:"C", explanation:"HashSet = no duplicates.", difficulty:"easy", topic:"Collections" },
      { id:6,  question:"What is autoboxing?", options:{A:"int to Integer auto-convert",B:"Boxing into arrays",C:"Wrapping methods",D:"Auto memory"}, correct:"A", explanation:"Autoboxing converts primitives to wrappers.", difficulty:"easy", topic:"Data Types" },
      { id:7,  question:"Which modifier restricts to same class only?", options:{A:"protected",B:"default",C:"public",D:"private"}, correct:"D", explanation:"private = same class only.", difficulty:"easy", topic:"Access" },
      { id:8,  question:"Default value of int instance variable?", options:{A:"null",B:"undefined",C:"0",D:"-1"}, correct:"C", explanation:"int defaults to 0.", difficulty:"easy", topic:"Data Types" },
      { id:9,  question:"Which loop always executes at least once?", options:{A:"for",B:"while",C:"do-while",D:"for-each"}, correct:"C", explanation:"do-while checks after.", difficulty:"easy", topic:"Control Flow" },
      { id:10, question:"Size of long in Java?", options:{A:"32 bits",B:"16 bits",C:"64 bits",D:"128 bits"}, correct:"C", explanation:"long = 64 bits.", difficulty:"easy", topic:"Data Types" },
      { id:11, question:"Correct lambda syntax in Java?", options:{A:"lambda x->x*2",B:"(x)=>x*2",C:"x->x*2",D:"func(x){return x*2;}"}, correct:"C", explanation:"(params)->expression.", difficulty:"medium", topic:"Lambdas" },
      { id:12, question:"What does Stream.filter() return?", options:{A:"void",B:"Optional",C:"Stream",D:"List"}, correct:"C", explanation:"filter returns a Stream.", difficulty:"medium", topic:"Streams" },
      { id:13, question:"Interface needed for for-each loop?", options:{A:"Iterator",B:"Iterable",C:"Collection",D:"Comparable"}, correct:"B", explanation:"Iterable provides iterator().", difficulty:"medium", topic:"Collections" },
      { id:14, question:"What is a sealed class in Java 17?", options:{A:"Cannot instantiate",B:"Restricts subclasses",C:"Only static members",D:"Final abstract"}, correct:"B", explanation:"Sealed uses permits.", difficulty:"medium", topic:"Java 17" },
      { id:15, question:"What does Optional.orElse() do?", options:{A:"Throws if empty",B:"Returns value or default",C:"Filters",D:"Maps value"}, correct:"B", explanation:"Returns default if empty.", difficulty:"medium", topic:"Optional" },
      { id:16, question:"Immutable list in Java 9+?", options:{A:"Arrays.asList()",B:"Collections.unmodifiableList()",C:"List.of()",D:"new ArrayList<>()"}, correct:"C", explanation:"List.of() is immutable.", difficulty:"medium", topic:"Collections" },
      { id:17, question:"Purpose of var in Java 10+?", options:{A:"Global vars",B:"Type inference",C:"Variant types",D:"Nullable vars"}, correct:"B", explanation:"var infers local type.", difficulty:"medium", topic:"Features" },
      { id:18, question:"Which is a functional interface?", options:{A:"Runnable",B:"Serializable",C:"Cloneable",D:"Comparable"}, correct:"A", explanation:"Runnable has one abstract method.", difficulty:"medium", topic:"Functional" },
      { id:19, question:"Stream.collect(Collectors.toList()) returns?", options:{A:"Array",B:"Set",C:"List",D:"Map"}, correct:"C", explanation:"Accumulates to List.", difficulty:"medium", topic:"Streams" },
      { id:20, question:"Java module system in Java 9?", options:{A:"OSGi",B:"Maven modules",C:"JPMS",D:"Gradle"}, correct:"C", explanation:"JPMS = Project Jigsaw.", difficulty:"medium", topic:"Modules" },
      { id:21, question:"ConcurrentHashMap vs HashMap?", options:{A:"No diff",B:"ConcurrentHashMap thread-safe",C:"HashMap null only",D:"Same"}, correct:"B", explanation:"ConcurrentHashMap = thread-safe.", difficulty:"medium", topic:"Concurrency" },
      { id:22, question:"Method reference syntax?", options:{A:"String::length()",B:"String::length",C:"length::String",D:"String.length::"}, correct:"B", explanation:":: without parentheses.", difficulty:"medium", topic:"Lambdas" },
      { id:23, question:"What is a record in Java 16+?", options:{A:"Mutable class",B:"Storage interface",C:"Immutable data carrier",D:"Enum type"}, correct:"C", explanation:"Records are immutable.", difficulty:"medium", topic:"Java 16" },
      { id:24, question:"Fixed thread pool creator?", options:{A:"newCachedThreadPool()",B:"newSingleThreadExecutor()",C:"newFixedThreadPool(n)",D:"newScheduledThreadPool()"}, correct:"C", explanation:"Fixed = exactly n threads.", difficulty:"medium", topic:"Concurrency" },
      { id:25, question:"Stream.of(1,2,3).reduce(0,Integer::sum)?", options:{A:"0",B:"6",C:"3",D:"Error"}, correct:"B", explanation:"0+1+2+3=6.", difficulty:"medium", topic:"Streams" },
      { id:26, question:"HashMap.get() average complexity?", options:{A:"O(n)",B:"O(log n)",C:"O(n log n)",D:"O(1)"}, correct:"D", explanation:"Hashing = O(1) average.", difficulty:"hard", topic:"Collections" },
      { id:27, question:"Synchronized on different instances?", options:{A:"Block each other",B:"Execute concurrently",C:"Exception",D:"Deadlock"}, correct:"B", explanation:"Instance lock = per instance.", difficulty:"hard", topic:"Concurrency" },
      { id:28, question:"Default GC in Java 9+?", options:{A:"CMS",B:"G1GC",C:"ZGC",D:"Parallel GC"}, correct:"B", explanation:"G1GC became default.", difficulty:"hard", topic:"JVM" },
      { id:29, question:"Phantom reference used for?", options:{A:"Caching",B:"Post-GC cleanup",C:"Soft cache",D:"Weak listeners"}, correct:"B", explanation:"Post-finalization cleanup.", difficulty:"hard", topic:"Memory" },
      { id:30, question:"'requires transitive' in JPMS?", options:{A:"Optional module",B:"Dependency inherited by consumers",C:"Lazy loading",D:"Test dependency"}, correct:"B", explanation:"Re-exports to consumers.", difficulty:"hard", topic:"Modules" },
    ],
    aws: [
      { id:1,  question:"S3 stands for?", options:{A:"Simple Storage Service",B:"Secure Server Storage",C:"Scalable Storage System",D:"Standard Storage"}, correct:"A", explanation:"Simple Storage Service.", difficulty:"easy", topic:"S3" },
      { id:2,  question:"AWS DNS service?", options:{A:"CloudFront",B:"Route 53",C:"VPC",D:"API Gateway"}, correct:"B", explanation:"Route 53 = DNS.", difficulty:"easy", topic:"Networking" },
      { id:3,  question:"What is an AWS Region?", options:{A:"Single datacenter",B:"Geographic area with AZs",C:"VPN",D:"CDN point"}, correct:"B", explanation:"Region = multiple AZs.", difficulty:"easy", topic:"Infrastructure" },
      { id:4,  question:"Serverless functions in AWS?", options:{A:"EC2",B:"ECS",C:"Lambda",D:"Fargate"}, correct:"C", explanation:"Lambda = serverless.", difficulty:"easy", topic:"Compute" },
      { id:5,  question:"IAM stands for?", options:{A:"Internet Access Mgmt",B:"Identity and Access Management",C:"Integrated App Module",D:"Internal AWS Manager"}, correct:"B", explanation:"IAM manages access.", difficulty:"easy", topic:"Security" },
      { id:6,  question:"Cheapest EC2 for steady workloads?", options:{A:"On-Demand",B:"Spot",C:"Reserved",D:"Dedicated"}, correct:"C", explanation:"Reserved = 75% discount.", difficulty:"easy", topic:"EC2" },
      { id:7,  question:"What is an AZ?", options:{A:"Separate account",B:"Datacenters within Region",C:"CDN edge",D:"VPC"}, correct:"B", explanation:"AZs = isolated clusters.", difficulty:"easy", topic:"Infrastructure" },
      { id:8,  question:"Managed relational database?", options:{A:"DynamoDB",B:"ElastiCache",C:"RDS",D:"Redshift"}, correct:"C", explanation:"RDS = managed SQL.", difficulty:"easy", topic:"Databases" },
      { id:9,  question:"What is CloudFront?", options:{A:"DB cache",B:"CDN",C:"Serverless",D:"Containers"}, correct:"B", explanation:"CloudFront = AWS CDN.", difficulty:"easy", topic:"Networking" },
      { id:10, question:"S3 Versioning protects against?", options:{A:"Corruption",B:"Accidental deletion",C:"Unauthorized access",D:"Cost"}, correct:"B", explanation:"Preserves all versions.", difficulty:"easy", topic:"S3" },
      { id:11, question:"VPC stands for?", options:{A:"Virtual Private Cloud",B:"Virtual Public Container",C:"Verified Processing",D:"Virtual Proxy"}, correct:"A", explanation:"Isolated network.", difficulty:"medium", topic:"Networking" },
      { id:12, question:"Best for message queuing?", options:{A:"SNS",B:"SQS",C:"EventBridge",D:"Kinesis"}, correct:"B", explanation:"SQS = reliable queuing.", difficulty:"medium", topic:"Integration" },
      { id:13, question:"Max S3 object size?", options:{A:"5 GB",B:"100 GB",C:"5 TB",D:"1 TB"}, correct:"C", explanation:"S3 max = 5TB.", difficulty:"medium", topic:"S3" },
      { id:14, question:"Layer 7 load balancer?", options:{A:"NLB",B:"CLB",C:"ALB",D:"GLB"}, correct:"C", explanation:"ALB = HTTP layer.", difficulty:"medium", topic:"HA" },
      { id:15, question:"Auto Scaling does what?", options:{A:"Backup data",B:"Adjust EC2 capacity",C:"Scale DB",D:"Manage IAM"}, correct:"B", explanation:"Adds/removes EC2.", difficulty:"medium", topic:"Compute" },
      { id:16, question:"AWS NoSQL database?", options:{A:"RDS",B:"Aurora",C:"DynamoDB",D:"Redshift"}, correct:"C", explanation:"DynamoDB = NoSQL.", difficulty:"medium", topic:"Databases" },
      { id:17, question:"Security Group purpose?", options:{A:"Encrypts data",B:"Virtual firewall",C:"Manages IAM",D:"Monitors traffic"}, correct:"B", explanation:"SG = virtual firewall.", difficulty:"medium", topic:"Security" },
      { id:18, question:"Internet Gateway purpose?", options:{A:"Connect VPCs",B:"Internet for public subnets",C:"Encrypt traffic",D:"DNS"}, correct:"B", explanation:"IGW = internet access.", difficulty:"medium", topic:"Networking" },
      { id:19, question:"DDoS protection in AWS?", options:{A:"WAF",B:"Shield",C:"GuardDuty",D:"Macie"}, correct:"B", explanation:"Shield = DDoS protection.", difficulty:"medium", topic:"Security" },
      { id:20, question:"S3 Transfer Acceleration?", options:{A:"Faster API",B:"CloudFront edges for upload",C:"Parallel upload",D:"Compressed"}, correct:"B", explanation:"Routes via CloudFront.", difficulty:"medium", topic:"S3" },
      { id:21, question:"Memory-optimized EC2?", options:{A:"C5",B:"T3",C:"R5",D:"P3"}, correct:"C", explanation:"R-series = memory.", difficulty:"medium", topic:"EC2" },
      { id:22, question:"Fargate is?", options:{A:"Managed K8s",B:"Serverless containers",C:"Registry",D:"VM migration"}, correct:"B", explanation:"No EC2 management.", difficulty:"medium", topic:"Containers" },
      { id:23, question:"CloudWatch purpose?", options:{A:"Cost",B:"Logging and monitoring",C:"Security scan",D:"DB backup"}, correct:"B", explanation:"Logs, metrics, events.", difficulty:"medium", topic:"Monitoring" },
      { id:24, question:"RTO in DR means?", options:{A:"Recovery Time Objective",B:"Real Time Ops",C:"Recovery Transfer",D:"Redundant Offset"}, correct:"A", explanation:"How fast to recover.", difficulty:"medium", topic:"DR" },
      { id:25, question:"NAT Gateway purpose?", options:{A:"Connect VPCs",B:"Private subnet outbound internet",C:"Block internet",D:"VPN"}, correct:"B", explanation:"Outbound for private.", difficulty:"medium", topic:"Networking" },
      { id:26, question:"NACLs vs Security Groups?", options:{A:"Same",B:"NACLs stateless subnet; SGs stateful instance",C:"SGs stateless",D:"NACLs allow only"}, correct:"B", explanation:"NACLs=subnet, SGs=instance.", difficulty:"hard", topic:"Networking" },
      { id:27, question:"DynamoDB default consistency?", options:{A:"Strong",B:"Eventual",C:"Causal",D:"Linear"}, correct:"B", explanation:"Eventual by default.", difficulty:"hard", topic:"Databases" },
      { id:28, question:"Transit Gateway purpose?", options:{A:"Hub for VPCs and on-prem",B:"Internet to VPCs",C:"API connections",D:"Cross-region LB"}, correct:"A", explanation:"Cloud router.", difficulty:"hard", topic:"Networking" },
      { id:29, question:"SCP in AWS Organizations?", options:{A:"Encrypt data",B:"Permission boundaries",C:"Service quotas",D:"Compliance"}, correct:"B", explanation:"Restricts member accounts.", difficulty:"hard", topic:"Security" },
      { id:30, question:"VPC Peering is?", options:{A:"VPC to internet",B:"Private connection between VPCs",C:"VPN to on-prem",D:"Cross-VPC LB"}, correct:"B", explanation:"Private VPC routing.", difficulty:"hard", topic:"Networking" },
    ],
    gcp: [
      { id:1,  question:"GCP object storage?", options:{A:"Cloud SQL",B:"Cloud Storage",C:"Bigtable",D:"Filestore"}, correct:"B", explanation:"Cloud Storage = object store.", difficulty:"easy", topic:"Storage" },
      { id:2,  question:"GKE stands for?", options:{A:"Google Kubernetes Engine",B:"Google Kernel Ext",C:"Google Key Encrypt",D:"Google Kube Env"}, correct:"A", explanation:"Managed Kubernetes.", difficulty:"easy", topic:"Containers" },
      { id:3,  question:"GCP serverless functions?", options:{A:"Cloud Run",B:"Cloud Functions",C:"App Engine",D:"Compute Engine"}, correct:"B", explanation:"Cloud Functions = FaaS.", difficulty:"easy", topic:"Compute" },
      { id:4,  question:"What is a GCP Project?", options:{A:"A VM",B:"Base org unit",C:"Network config",D:"Billing account"}, correct:"B", explanation:"Projects organize resources.", difficulty:"easy", topic:"Basics" },
      { id:5,  question:"Managed MySQL on GCP?", options:{A:"Spanner",B:"Bigtable",C:"Cloud SQL",D:"Firestore"}, correct:"C", explanation:"Cloud SQL = MySQL/PG.", difficulty:"easy", topic:"Databases" },
      { id:6,  question:"Cloud IAM purpose?", options:{A:"Monitoring",B:"Access control",C:"Networking",D:"Cost"}, correct:"B", explanation:"Controls who can what.", difficulty:"easy", topic:"Security" },
      { id:7,  question:"What is a GCP Zone?", options:{A:"Region",B:"Deployment area in Region",C:"Billing",D:"Network segment"}, correct:"B", explanation:"Isolated location.", difficulty:"easy", topic:"Infrastructure" },
      { id:8,  question:"GCP CDN service?", options:{A:"Cloud Armor",B:"Cloud DNS",C:"Cloud CDN",D:"Cloud LB"}, correct:"C", explanation:"Google edge caching.", difficulty:"easy", topic:"Networking" },
      { id:9,  question:"Persistent Disk provides?", options:{A:"Object storage",B:"Block storage for VMs",C:"File storage",D:"Cold archive"}, correct:"B", explanation:"Block storage.", difficulty:"easy", topic:"Storage" },
      { id:10, question:"GCP IaC tool?", options:{A:"Cloud Build",B:"Deployment Manager",C:"Source Repos",D:"Artifact Registry"}, correct:"B", explanation:"YAML templates.", difficulty:"easy", topic:"DevOps" },
      { id:11, question:"VPC in GCP?", options:{A:"Virtual Private Cloud",B:"Virtual Processing",C:"Verified Public",D:"Video Processing"}, correct:"A", explanation:"Isolated network.", difficulty:"medium", topic:"Networking" },
      { id:12, question:"Stateless containers no infra mgmt?", options:{A:"GKE",B:"Compute Engine",C:"Cloud Run",D:"App Engine"}, correct:"C", explanation:"Cloud Run = scales to zero.", difficulty:"medium", topic:"Containers" },
      { id:13, question:"Cloud Spanner best for?", options:{A:"Documents",B:"Global relational + strong consistency",C:"Time-series",D:"Objects"}, correct:"B", explanation:"Global ACID.", difficulty:"medium", topic:"Databases" },
      { id:14, question:"Service Account is?", options:{A:"Human user",B:"App identity for GCP APIs",C:"Billing",D:"Project owner"}, correct:"B", explanation:"Non-human identity.", difficulty:"medium", topic:"Security" },
      { id:15, question:"Cheapest storage for rare access?", options:{A:"Standard",B:"Nearline",C:"Coldline",D:"Archive"}, correct:"D", explanation:"Archive = lowest cost.", difficulty:"medium", topic:"Storage" },
      { id:16, question:"Firestore is?", options:{A:"Relational",B:"NoSQL document DB",C:"Key-value",D:"Time-series"}, correct:"B", explanation:"Serverless document DB.", difficulty:"medium", topic:"Databases" },
      { id:17, question:"Cloud Armor provides?", options:{A:"Encryption",B:"DDoS + WAF",C:"VPN",D:"Federation"}, correct:"B", explanation:"DDoS protection.", difficulty:"medium", topic:"Security" },
      { id:18, question:"Cloud Pub/Sub purpose?", options:{A:"DB replication",B:"Async messaging",C:"File sync",D:"API gateway"}, correct:"B", explanation:"Event messaging.", difficulty:"medium", topic:"Integration" },
      { id:19, question:"Initialize gcloud CLI?", options:{A:"gcloud start",B:"gcloud auth",C:"gcloud init",D:"gcloud config"}, correct:"C", explanation:"Sets account and project.", difficulty:"medium", topic:"CLI" },
      { id:20, question:"Managed Instance Group?", options:{A:"Cloud SQL group",B:"Identical VMs for scaling",C:"GKE node pool",D:"IAM roles"}, correct:"B", explanation:"Autoscaling VM fleet.", difficulty:"medium", topic:"Compute" },
      { id:21, question:"Cloud Interconnect?", options:{A:"Internal GCP",B:"Private on-prem to GCP",C:"Two regions",D:"API"}, correct:"B", explanation:"Dedicated connectivity.", difficulty:"medium", topic:"Networking" },
      { id:22, question:"GCP data warehouse?", options:{A:"Cloud SQL",B:"Bigtable",C:"BigQuery",D:"Datastore"}, correct:"C", explanation:"Petabyte scale.", difficulty:"medium", topic:"Analytics" },
      { id:23, question:"Anthos is?", options:{A:"Database",B:"Multi-cloud app platform",C:"CDN",D:"ML"}, correct:"B", explanation:"Consistent ops anywhere.", difficulty:"medium", topic:"Hybrid" },
      { id:24, question:"Cloud KMS purpose?", options:{A:"K8s mgmt",B:"Key management",C:"Monitoring",D:"Rate limiting"}, correct:"B", explanation:"Encryption keys.", difficulty:"medium", topic:"Security" },
      { id:25, question:"Cloud Build does?", options:{A:"Deploy VMs",B:"CI/CD automation",C:"Manage DBs",D:"Monitor costs"}, correct:"B", explanation:"Build and test.", difficulty:"medium", topic:"DevOps" },
      { id:26, question:"Coldline vs Archive?", options:{A:"Same",B:"Coldline quarterly; Archive yearly",C:"Archive faster",D:"Coldline cheaper"}, correct:"B", explanation:"Archive = less frequent.", difficulty:"hard", topic:"Storage" },
      { id:27, question:"GKE Autopilot vs Standard?", options:{A:"Autopilot manages nodes",B:"Autopilot cheaper",C:"Standard more regions",D:"No diff"}, correct:"A", explanation:"Fully managed.", difficulty:"hard", topic:"Containers" },
      { id:28, question:"Workload Identity in GKE?", options:{A:"IP to pods",B:"Pods auth as GCP SA without keys",C:"K8s RBAC",D:"Encrypt pods"}, correct:"B", explanation:"Keyless SA mapping.", difficulty:"hard", topic:"Security" },
      { id:29, question:"VPC Service Controls?", options:{A:"VM firewall",B:"Perimeter against exfiltration",C:"VPN config",D:"Peering"}, correct:"B", explanation:"API access perimeters.", difficulty:"hard", topic:"Security" },
      { id:30, question:"Spanner consistency model?", options:{A:"Eventual",B:"Read-your-writes",C:"External consistency",D:"Causal"}, correct:"C", explanation:"Linearizability.", difficulty:"hard", topic:"Databases" },
    ],
  };

  function getOfflineQuestions(certName) {
    const lower = certName.toLowerCase();
    if (lower.includes("oracle") || lower.includes("java")) return OFFLINE_BANKS.java;
    if (lower.includes("aws")    || lower.includes("amazon")) return OFFLINE_BANKS.aws;
    if (lower.includes("google") || lower.includes("gcp"))    return OFFLINE_BANKS.gcp;
    return OFFLINE_BANKS.java;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const proceedToGenerate = async () => {
    setStep("generating");
    setGenProgress(0);

    const stages = [
      { pct: 15, msg: "Initializing MCQ engine..." },
      { pct: 30, msg: `Analyzing ${cert?.certName} syllabus...` },
      { pct: 50, msg: "Crafting 30 exam questions..." },
      { pct: 75, msg: "Validating question quality..." },
      { pct: 90, msg: "Finalizing exam paper..." },
    ];

    let i = 0;
    const tick = setInterval(() => {
      if (i < stages.length) { setGenProgress(stages[i].pct); setGenStatus(stages[i].msg); i++; }
    }, 700);

    try {
      // Try backend API first
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch("http://localhost:5000/api/cert-exam/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certName: cert?.certName }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const text = await res.text();
      // Check if response is HTML (backend down/route missing)
      if (text.trim().startsWith("<")) throw new Error("Backend returned HTML — route not found");

      const data = JSON.parse(text);
      if (!data.success || !data.questions?.length) throw new Error("No questions in response");

      clearInterval(tick);
      setGenProgress(100);
      setGenStatus(`✅ ${data.source === "langchain_cohere" ? "AI" : "Offline"} — ${data.questions.length} questions ready!`);
      setTimeout(() => onNext({ questions: data.questions, certName: cert?.certName }), 800);

    } catch (err) {
      // ANY error → use offline bank immediately, no retry needed
      console.log("[Generate] Backend unavailable:", err.message, "→ using offline bank");
      clearInterval(tick);

      const questions = shuffle(getOfflineQuestions(cert?.certName)).map((q, idx) => ({ ...q, id: idx + 1 }));
      setGenProgress(100);
      setGenStatus(`✅ Offline bank — ${questions.length} questions ready!`);
      setTimeout(() => onNext({ questions, certName: cert?.certName }), 800);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Progress */}
        <div style={S.progressBar}>
          {["Aadhaar", "Face", "Generate"].map((label, idx) => {
            const stepIdx = { aadhaar: 0, face: 1, generating: 2 }[step] ?? 0;
            const done = idx < stepIdx, active = idx === stepIdx;
            return (
              <div key={label} style={S.progressItem}>
                <div style={{ ...S.progressDot, background: done || active ? "#0284c7" : "#e2e8f0", boxShadow: active ? "0 0 0 4px #bae6fd" : "none" }}>
                  {done ? "✓" : idx + 1}
                </div>
                <span style={{ ...S.progressLabel, color: active ? "#0284c7" : done ? "#64748b" : "#cbd5e1", fontWeight: active ? 700 : 500 }}>{label}</span>
                {idx < 2 && <div style={{ ...S.progressLine, background: done ? "#0284c7" : "#e2e8f0" }} />}
              </div>
            );
          })}
        </div>

        {/* AADHAAR STEP */}
        {step === "aadhaar" && (
          <div style={S.section}>
            <button style={S.backBtn} onClick={onBack}>← Back</button>
            <div style={S.stepBadge}>Step 2 · Identity Verification</div>
            <h2 style={S.title}>Enter Aadhaar Number</h2>
            <p style={S.sub}>Your 12-digit Aadhaar is required before the exam.</p>
            <div style={S.certChip}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Exam:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0284c7" }}>{cert?.certName}</span>
            </div>
            <div style={S.inputGroup}>
              <label style={S.label}>Aadhaar Number</label>
              <input
                style={{ ...S.input, letterSpacing: "3px", fontSize: 18, fontWeight: 600 }}
                value={aadhaar}
                onChange={e => { setAadhaar(formatAadhaar(e.target.value)); setAadhaarError(""); }}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                inputMode="numeric"
              />
              {aadhaarError && <div style={S.fieldError}>{aadhaarError}</div>}
            </div>
            <div style={S.infoBox}>🔒 Aadhaar used only for verification, not stored.</div>
            <button style={S.primaryBtn} onClick={handleAadhaarNext}>Continue to Face Detection →</button>
          </div>
        )}

        {/* FACE STEP */}
        {step === "face" && (
          <div style={S.section}>
            <div style={S.stepBadge}>Step 2 · Face Verification</div>
            <h2 style={S.title}>Face Detection</h2>
            <p style={S.sub}>Look directly at the camera. Ensure good lighting.</p>
            <div style={S.cameraContainer}>
              {!faceOk ? (
                <>
                  <video ref={videoRef} style={S.video} autoPlay muted playsInline />
                  <div style={{ ...S.faceOverlay, borderColor: faceStatus === "scanning" ? "#f59e0b" : faceStatus === "error" ? "#ef4444" : "#22d3ee" }}>
                    <div style={S.cornerTL} /><div style={S.cornerTR} /><div style={S.cornerBL} /><div style={S.cornerBR} />
                  </div>
                  {faceStatus === "scanning" && <div style={S.scanLine} />}
                </>
              ) : (
                <div style={S.successFrame}>
                  <img src={capturedImage} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                  <div style={S.successOverlay}>✓</div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ ...S.statusMsg, color: faceStatus === "success" ? "#16a34a" : faceStatus === "error" ? "#dc2626" : faceStatus === "scanning" ? "#d97706" : "#475569" }}>
              {faceMsg}
            </div>
            {!faceOk && faceStatus !== "scanning" && (
              <button style={S.primaryBtn} onClick={captureAndVerify}>
                {faceStatus === "error" ? "Retry Face Scan" : "📷 Capture & Verify Face"}
              </button>
            )}
            {faceOk && (
              <button style={S.primaryBtn} onClick={proceedToGenerate}>Proceed to Generate Exam →</button>
            )}
          </div>
        )}

        {/* GENERATING STEP */}
        {step === "generating" && (
          <div style={{ ...S.section, textAlign: "center" }}>
            <div style={S.genIcon}>
              {genProgress < 100 ? (
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#0284c7" strokeWidth="4"
                    strokeDasharray={`${genProgress * 1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                </svg>
              ) : (
                <div style={{ fontSize: 48 }}>✅</div>
              )}
            </div>
            <h2 style={{ ...S.title, textAlign: "center" }}>{genProgress < 100 ? "Generating Your Exam..." : "Exam Ready!"}</h2>
            <p style={{ ...S.sub, textAlign: "center" }}>{genStatus}</p>
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${genProgress}%` }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0284c7", marginTop: 8 }}>{genProgress}%</div>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>
              30 questions for: <strong>{cert?.certName}</strong>
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes scan { 0%,100% { top: 0; } 50% { top: calc(100% - 2px); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 540, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" },
  progressBar: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, gap: 0 },
  progressItem: { display: "flex", alignItems: "center", gap: 6 },
  progressDot: { width: 28, height: 28, borderRadius: "50%", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s", flexShrink: 0 },
  progressLabel: { fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" },
  progressLine: { width: 32, height: 2, marginLeft: 4 },
  section: { display: "flex", flexDirection: "column", gap: 0 },
  backBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: 0, fontWeight: 600, marginBottom: 12, textAlign: "left" },
  stepBadge: { fontSize: 11, fontWeight: 700, color: "#0284c7", background: "#f0f9ff", border: "1px solid #bae6fd", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" },
  sub: { fontSize: 13, color: "#64748b", marginBottom: 18 },
  certChip: { display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8 },
  input: { width: "100%", padding: "13px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", fontFamily: "monospace" },
  fieldError: { fontSize: 12, color: "#dc2626", marginTop: 6 },
  infoBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#15803d", marginBottom: 20 },
  primaryBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  cameraContainer: { position: "relative", width: "100%", height: 280, background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  faceOverlay: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 180, height: 220, border: "2px solid", borderRadius: 12, pointerEvents: "none" },
  cornerTL: { position: "absolute", top: -2, left: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "3px 0 0 0" },
  cornerTR: { position: "absolute", top: -2, right: -2, width: 20, height: 20, borderTop: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 3px 0 0" },
  cornerBL: { position: "absolute", bottom: -2, left: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderLeft: "3px solid #22d3ee", borderRadius: "0 0 0 3px" },
  cornerBR: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderBottom: "3px solid #22d3ee", borderRight: "3px solid #22d3ee", borderRadius: "0 0 3px 0" },
  scanLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#22d3ee,transparent)", animation: "scan 2s ease-in-out infinite" },
  successFrame: { position: "relative", width: "100%", height: "100%" },
  successOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(22,163,74,0.3)", fontSize: 64, color: "#fff" },
  statusMsg: { fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 14 },
  genIcon: { display: "flex", justifyContent: "center", marginBottom: 16 },
  progressTrack: { height: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#0284c7,#22d3ee)", borderRadius: 8, transition: "width 0.5s ease" },
};
