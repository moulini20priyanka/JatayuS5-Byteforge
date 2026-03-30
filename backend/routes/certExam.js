// backend/routes/certExam.js
// Uses LangChain + Cohere Chat API for MCQ generation
const express = require("express");
const router  = express.Router();

// ─── LangChain imports ────────────────────────────────────────────────────────
const { ChatCohere }      = require("@langchain/cohere");
const { PromptTemplate }  = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence }   = require("@langchain/core/runnables");

// ─── LangChain MCQ Chain ──────────────────────────────────────────────────────
// Chain: PromptTemplate → ChatCohere → StringOutputParser
const MCQ_PROMPT = PromptTemplate.fromTemplate(`
You are an expert certification exam question creator.
Generate exactly 30 multiple choice questions for the certification: "{certName}".

RULES:
- Questions must be strictly about "{certName}" topics only
- Mix difficulty: 10 easy, 15 medium, 5 hard
- Each question has exactly 4 options: A, B, C, D
- Only one correct answer per question
- Return ONLY valid JSON, no markdown, no backticks, no extra text outside JSON

Return ONLY this exact JSON structure:
{{
  "questions": [
    {{
      "id": 1,
      "question": "question text here",
      "options": {{"A": "option a", "B": "option b", "C": "option c", "D": "option d"}},
      "correct": "A",
      "explanation": "why A is correct",
      "difficulty": "easy",
      "topic": "topic name"
    }}
  ]
}}
`);

const VIOLATION_PROMPT = PromptTemplate.fromTemplate(`
You are an AI exam proctoring agent. Analyze this violation and respond with ONLY valid JSON.
Violation Type: {violationType}
Context: {context}
Violations so far: {count}

Return exactly this JSON:
{{"severity": "low", "action": "warn", "message": "short message to student"}}
severity must be: low or medium or high
action must be: warn or flag or terminate
`);

// ─── Build LangChain chain ────────────────────────────────────────────────────
function getMCQChain() {
  const llm = new ChatCohere({
    apiKey: process.env.COHERE_API_KEY,
    model: "command-r",
    temperature: 0.3,
    maxTokens: 4000,
  });
  return RunnableSequence.from([
    MCQ_PROMPT,
    llm,
    new StringOutputParser(),
  ]);
}

function getViolationChain() {
  const llm = new ChatCohere({
    apiKey: process.env.COHERE_API_KEY,
    model: "command-r",
    temperature: 0,
    maxTokens: 200,
  });
  return RunnableSequence.from([
    VIOLATION_PROMPT,
    llm,
    new StringOutputParser(),
  ]);
}

// ─── Parse JSON safely ────────────────────────────────────────────────────────
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start   = cleaned.indexOf("{");
  const end     = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in LangChain response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ─── Offline Question Bank (fallback) ────────────────────────────────────────
const QUESTION_BANKS = {
  default_java: [
    { question: "Which of the following is NOT a primitive type in Java?", options: { A: "int", B: "String", C: "boolean", D: "char" }, correct: "B", explanation: "String is a class, not a primitive type.", difficulty: "easy", topic: "Data Types" },
    { question: "What is the output of: System.out.println(10 / 3)?", options: { A: "3.33", B: "3", C: "4", D: "Compilation error" }, correct: "B", explanation: "Integer division truncates the decimal.", difficulty: "easy", topic: "Operators" },
    { question: "Which keyword prevents a class from being subclassed?", options: { A: "static", B: "abstract", C: "final", D: "sealed" }, correct: "C", explanation: "final prevents inheritance.", difficulty: "easy", topic: "OOP" },
    { question: "What does JVM stand for?", options: { A: "Java Virtual Machine", B: "Java Variable Method", C: "Java Verified Module", D: "Java Visual Manager" }, correct: "A", explanation: "JVM executes Java bytecode.", difficulty: "easy", topic: "Java Basics" },
    { question: "Which collection does NOT allow duplicates?", options: { A: "ArrayList", B: "LinkedList", C: "HashSet", D: "Vector" }, correct: "C", explanation: "HashSet implements Set which forbids duplicates.", difficulty: "easy", topic: "Collections" },
    { question: "What is autoboxing in Java?", options: { A: "Converting int to Integer automatically", B: "Boxing objects into arrays", C: "Wrapping methods in classes", D: "Automatic memory allocation" }, correct: "A", explanation: "Autoboxing converts primitives to wrapper classes.", difficulty: "easy", topic: "Data Types" },
    { question: "Which modifier restricts access to the same class only?", options: { A: "protected", B: "default", C: "public", D: "private" }, correct: "D", explanation: "private restricts access to declaring class.", difficulty: "easy", topic: "Access Modifiers" },
    { question: "Default value of an int instance variable?", options: { A: "null", B: "undefined", C: "0", D: "-1" }, correct: "C", explanation: "int defaults to 0.", difficulty: "easy", topic: "Data Types" },
    { question: "Which loop always executes at least once?", options: { A: "for", B: "while", C: "do-while", D: "for-each" }, correct: "C", explanation: "do-while checks condition after execution.", difficulty: "easy", topic: "Control Flow" },
    { question: "Size of a long in Java?", options: { A: "32 bits", B: "16 bits", C: "64 bits", D: "128 bits" }, correct: "C", explanation: "long is 64-bit.", difficulty: "easy", topic: "Data Types" },
    { question: "Correct lambda syntax in Java?", options: { A: "lambda x -> x*2", B: "(x) => x*2", C: "x -> x*2", D: "func(x){ return x*2; }" }, correct: "C", explanation: "Java lambda: (params) -> expression.", difficulty: "medium", topic: "Lambdas" },
    { question: "What does Stream.filter() return?", options: { A: "void", B: "Optional", C: "Stream", D: "List" }, correct: "C", explanation: "filter() returns a new Stream.", difficulty: "medium", topic: "Streams" },
    { question: "Interface needed for for-each loop?", options: { A: "Iterator", B: "Iterable", C: "Collection", D: "Comparable" }, correct: "B", explanation: "Iterable provides iterator() for for-each.", difficulty: "medium", topic: "Collections" },
    { question: "What is a sealed class in Java 17?", options: { A: "Cannot be instantiated", B: "Restricts which classes can extend it", C: "Only static members", D: "Final abstract class" }, correct: "B", explanation: "Sealed classes use permits to restrict subclassing.", difficulty: "medium", topic: "Java 17" },
    { question: "What does Optional.orElse() do?", options: { A: "Throws if empty", B: "Returns value or default if empty", C: "Filters optional", D: "Maps value" }, correct: "B", explanation: "orElse() returns default when Optional is empty.", difficulty: "medium", topic: "Optional" },
    { question: "How to create immutable list in Java 9+?", options: { A: "Arrays.asList()", B: "Collections.unmodifiableList()", C: "List.of()", D: "new ArrayList<>()" }, correct: "C", explanation: "List.of() creates immutable list.", difficulty: "medium", topic: "Collections" },
    { question: "Purpose of var keyword in Java 10+?", options: { A: "Global variables", B: "Local variable type inference", C: "Variant types", D: "Nullable variables" }, correct: "B", explanation: "var infers local variable types.", difficulty: "medium", topic: "Java Features" },
    { question: "Which is a functional interface?", options: { A: "Runnable", B: "Serializable", C: "Cloneable", D: "Comparable" }, correct: "A", explanation: "Runnable has exactly one abstract method: run().", difficulty: "medium", topic: "Functional Interfaces" },
    { question: "What does Stream.collect(Collectors.toList()) return?", options: { A: "Array", B: "Set", C: "List", D: "Map" }, correct: "C", explanation: "Collectors.toList() accumulates to a List.", difficulty: "medium", topic: "Streams" },
    { question: "Java module system introduced in Java 9?", options: { A: "OSGi", B: "Maven modules", C: "Project Jigsaw (JPMS)", D: "Gradle modules" }, correct: "C", explanation: "JPMS was introduced in Java 9.", difficulty: "medium", topic: "Modules" },
    { question: "Difference between HashMap and ConcurrentHashMap?", options: { A: "No difference", B: "ConcurrentHashMap is thread-safe", C: "HashMap allows null keys only", D: "Both identical" }, correct: "B", explanation: "ConcurrentHashMap is designed for concurrent access.", difficulty: "medium", topic: "Concurrency" },
    { question: "Correct method reference syntax?", options: { A: "String::length()", B: "String::length", C: "length::String", D: "String.length::" }, correct: "B", explanation: "Method references use :: without parentheses.", difficulty: "medium", topic: "Lambdas" },
    { question: "What is a record in Java 16+?", options: { A: "Mutable data class", B: "Interface for storage", C: "Immutable data carrier class", D: "Type of enum" }, correct: "C", explanation: "Records are immutable with auto-generated methods.", difficulty: "medium", topic: "Java 16" },
    { question: "Which creates a fixed thread pool?", options: { A: "Executors.newCachedThreadPool()", B: "Executors.newSingleThreadExecutor()", C: "Executors.newFixedThreadPool(n)", D: "Executors.newScheduledThreadPool()" }, correct: "C", explanation: "newFixedThreadPool creates exactly n threads.", difficulty: "medium", topic: "Concurrency" },
    { question: "Result of Stream.of(1,2,3).reduce(0, Integer::sum)?", options: { A: "0", B: "6", C: "3", D: "Error" }, correct: "B", explanation: "0+1+2+3 = 6.", difficulty: "medium", topic: "Streams" },
    { question: "Time complexity of HashMap.get() average case?", options: { A: "O(n)", B: "O(log n)", C: "O(n log n)", D: "O(1)" }, correct: "D", explanation: "HashMap uses hashing for O(1) average lookup.", difficulty: "hard", topic: "Collections" },
    { question: "Two threads call synchronized method on different instances?", options: { A: "Block each other", B: "Execute concurrently", C: "One throws exception", D: "Deadlock" }, correct: "B", explanation: "Instance synchronized locks the instance, not class.", difficulty: "hard", topic: "Concurrency" },
    { question: "Default GC in Java 9+?", options: { A: "CMS", B: "G1GC", C: "ZGC", D: "Parallel GC" }, correct: "B", explanation: "G1GC became default in Java 9.", difficulty: "hard", topic: "JVM" },
    { question: "Phantom reference used for?", options: { A: "Caching", B: "Post-mortem cleanup before GC", C: "Soft caching", D: "Weak listeners" }, correct: "B", explanation: "PhantomReference enables post-finalization cleanup.", difficulty: "hard", topic: "Memory" },
    { question: "'requires transitive' in JPMS means?", options: { A: "Optional module", B: "Dependency inherited by consumers", C: "Lazy loading", D: "Test-only dependency" }, correct: "B", explanation: "requires transitive re-exports dependency to consumers.", difficulty: "hard", topic: "Modules" },
  ],
  default_aws: [
    { question: "What does S3 stand for?", options: { A: "Simple Storage Service", B: "Secure Server Storage", C: "Scalable Storage System", D: "Standard Storage Solution" }, correct: "A", explanation: "S3 = Simple Storage Service.", difficulty: "easy", topic: "S3" },
    { question: "Which AWS service handles DNS?", options: { A: "CloudFront", B: "Route 53", C: "VPC", D: "API Gateway" }, correct: "B", explanation: "Route 53 is AWS DNS.", difficulty: "easy", topic: "Networking" },
    { question: "What is an AWS Region?", options: { A: "Single data center", B: "Geographic area with multiple AZs", C: "Virtual private network", D: "CDN point" }, correct: "B", explanation: "Region = multiple Availability Zones.", difficulty: "easy", topic: "Infrastructure" },
    { question: "Which runs serverless functions in AWS?", options: { A: "EC2", B: "ECS", C: "Lambda", D: "Fargate" }, correct: "C", explanation: "Lambda runs code without servers.", difficulty: "easy", topic: "Compute" },
    { question: "What does IAM stand for?", options: { A: "Internet Access Management", B: "Identity and Access Management", C: "Integrated Application Module", D: "Internal AWS Manager" }, correct: "B", explanation: "IAM manages users, roles, permissions.", difficulty: "easy", topic: "Security" },
    { question: "Cheapest EC2 pricing for steady workloads?", options: { A: "On-Demand", B: "Spot", C: "Reserved", D: "Dedicated" }, correct: "C", explanation: "Reserved offers up to 75% discount.", difficulty: "easy", topic: "EC2" },
    { question: "What is an Availability Zone?", options: { A: "Separate AWS account", B: "Data centers within a Region", C: "CDN edge location", D: "Virtual private cloud" }, correct: "B", explanation: "AZs are isolated clusters in a Region.", difficulty: "easy", topic: "Infrastructure" },
    { question: "Which provides managed relational databases?", options: { A: "DynamoDB", B: "ElastiCache", C: "RDS", D: "Redshift" }, correct: "C", explanation: "RDS manages MySQL, PostgreSQL etc.", difficulty: "easy", topic: "Databases" },
    { question: "What is CloudFront?", options: { A: "Database caching", B: "Content delivery network", C: "Serverless compute", D: "Container orchestration" }, correct: "B", explanation: "CloudFront is AWS CDN.", difficulty: "easy", topic: "Networking" },
    { question: "S3 Versioning protects against?", options: { A: "Data corruption", B: "Accidental deletion", C: "Unauthorized access", D: "Storage costs" }, correct: "B", explanation: "Versioning preserves all object versions.", difficulty: "easy", topic: "S3" },
    { question: "What is a VPC?", options: { A: "Virtual Private Cloud", B: "Virtual Public Container", C: "Verified Processing Center", D: "Virtual Proxy Connection" }, correct: "A", explanation: "VPC = isolated network in AWS.", difficulty: "medium", topic: "Networking" },
    { question: "Best service for message queuing?", options: { A: "SNS", B: "SQS", C: "EventBridge", D: "Kinesis" }, correct: "B", explanation: "SQS provides reliable queuing.", difficulty: "medium", topic: "Integration" },
    { question: "Maximum S3 object size?", options: { A: "5 GB", B: "100 GB", C: "5 TB", D: "1 TB" }, correct: "C", explanation: "S3 max object = 5TB.", difficulty: "medium", topic: "S3" },
    { question: "Which load balancer is Layer 7?", options: { A: "Network LB", B: "Classic LB", C: "Application LB", D: "Gateway LB" }, correct: "C", explanation: "ALB operates at HTTP/HTTPS layer.", difficulty: "medium", topic: "HA" },
    { question: "What is Auto Scaling?", options: { A: "Backing up data", B: "Adjusting EC2 capacity automatically", C: "Scaling DB storage", D: "Managing IAM" }, correct: "B", explanation: "Auto Scaling adds/removes EC2 based on demand.", difficulty: "medium", topic: "Compute" },
    { question: "Which provides NoSQL database?", options: { A: "RDS", B: "Aurora", C: "DynamoDB", D: "Redshift" }, correct: "C", explanation: "DynamoDB is AWS managed NoSQL.", difficulty: "medium", topic: "Databases" },
    { question: "What does a Security Group do?", options: { A: "Encrypts data", B: "Virtual firewall for EC2", C: "Manages IAM", D: "Monitors traffic" }, correct: "B", explanation: "SGs control inbound/outbound EC2 traffic.", difficulty: "medium", topic: "Security" },
    { question: "What does Internet Gateway do?", options: { A: "Connects VPCs", B: "Internet access for public subnets", C: "Encrypts traffic", D: "Manages DNS" }, correct: "B", explanation: "IGW enables VPC-internet communication.", difficulty: "medium", topic: "Networking" },
    { question: "Which provides DDoS protection?", options: { A: "WAF", B: "Shield", C: "GuardDuty", D: "Macie" }, correct: "B", explanation: "AWS Shield = DDoS protection.", difficulty: "medium", topic: "Security" },
    { question: "What is S3 Transfer Acceleration?", options: { A: "Faster API calls", B: "CloudFront edges speed up uploads", C: "Parallel multipart", D: "Compressed transfer" }, correct: "B", explanation: "Routes uploads through CloudFront edges.", difficulty: "medium", topic: "S3" },
    { question: "Memory-optimized EC2 instance type?", options: { A: "C5", B: "T3", C: "R5", D: "P3" }, correct: "C", explanation: "R-series = memory optimized.", difficulty: "medium", topic: "EC2" },
    { question: "What is Fargate?", options: { A: "Managed Kubernetes", B: "Serverless compute for containers", C: "Container registry", D: "VM migration" }, correct: "B", explanation: "Fargate runs containers without EC2 management.", difficulty: "medium", topic: "Containers" },
    { question: "What is CloudWatch for?", options: { A: "Cost management", B: "Logging and monitoring", C: "Security scanning", D: "DB backup" }, correct: "B", explanation: "CloudWatch = logs, metrics, events.", difficulty: "medium", topic: "Monitoring" },
    { question: "What does RTO mean in DR?", options: { A: "Recovery Time Objective", B: "Real Time Operations", C: "Recovery Transfer Option", D: "Redundant Time Offset" }, correct: "A", explanation: "RTO = how fast to recover.", difficulty: "medium", topic: "DR" },
    { question: "Purpose of NAT Gateway?", options: { A: "Connect two VPCs", B: "Private subnets outbound internet access", C: "Block all internet", D: "VPN connectivity" }, correct: "B", explanation: "NAT Gateway = outbound internet for private subnets.", difficulty: "medium", topic: "Networking" },
    { question: "NACLs vs Security Groups?", options: { A: "No difference", B: "NACLs stateless subnet; SGs stateful instance", C: "SGs stateless; NACLs stateful", D: "NACLs allow only; SGs deny only" }, correct: "B", explanation: "NACLs = stateless subnet; SGs = stateful instance.", difficulty: "hard", topic: "Networking" },
    { question: "DynamoDB default consistency?", options: { A: "Strong", B: "Eventual", C: "Causal", D: "Linear" }, correct: "B", explanation: "DynamoDB defaults to eventual consistency.", difficulty: "hard", topic: "Databases" },
    { question: "What is Transit Gateway?", options: { A: "Connect VPCs and on-prem via hub", B: "Internet to VPCs", C: "API connections", D: "Cross-region LB" }, correct: "A", explanation: "Transit Gateway = cloud router for VPCs and on-prem.", difficulty: "hard", topic: "Networking" },
    { question: "Purpose of SCP in AWS Organizations?", options: { A: "Encrypt cross-account data", B: "Permission boundaries for member accounts", C: "Service quotas", D: "Compliance monitoring" }, correct: "B", explanation: "SCPs restrict member account actions.", difficulty: "hard", topic: "Security" },
    { question: "What is VPC Peering?", options: { A: "VPC to internet", B: "Private connection between two VPCs", C: "VPN to on-prem", D: "Cross-VPC load balancing" }, correct: "B", explanation: "VPC Peering = private routing between VPCs.", difficulty: "hard", topic: "Networking" },
  ],
  default_gcp: [
    { question: "GCP's object storage service?", options: { A: "Cloud SQL", B: "Cloud Storage", C: "Bigtable", D: "Filestore" }, correct: "B", explanation: "Cloud Storage = GCP object storage.", difficulty: "easy", topic: "Storage" },
    { question: "GKE stands for?", options: { A: "Google Kubernetes Engine", B: "Google Kernel Extension", C: "Google Key Encryption", D: "Google Kube Environment" }, correct: "A", explanation: "GKE = managed Kubernetes.", difficulty: "easy", topic: "Containers" },
    { question: "GCP equivalent of AWS Lambda?", options: { A: "Cloud Run", B: "Cloud Functions", C: "App Engine", D: "Compute Engine" }, correct: "B", explanation: "Cloud Functions = serverless FaaS.", difficulty: "easy", topic: "Compute" },
    { question: "What is a GCP Project?", options: { A: "A VM", B: "Base organizational unit", C: "Network config", D: "Billing account" }, correct: "B", explanation: "Projects organize GCP resources.", difficulty: "easy", topic: "Basics" },
    { question: "Managed MySQL service on GCP?", options: { A: "Cloud Spanner", B: "Bigtable", C: "Cloud SQL", D: "Firestore" }, correct: "C", explanation: "Cloud SQL manages MySQL/PostgreSQL.", difficulty: "easy", topic: "Databases" },
    { question: "Cloud IAM purpose?", options: { A: "Monitoring", B: "Access control to GCP resources", C: "Networking", D: "Cost management" }, correct: "B", explanation: "IAM controls who can do what.", difficulty: "easy", topic: "Security" },
    { question: "What is a GCP Zone?", options: { A: "Geographic region", B: "Deployment area within a Region", C: "Billing boundary", D: "Network segment" }, correct: "B", explanation: "Zones are isolated locations within a Region.", difficulty: "easy", topic: "Infrastructure" },
    { question: "GCP CDN service?", options: { A: "Cloud Armor", B: "Cloud DNS", C: "Cloud CDN", D: "Cloud Load Balancing" }, correct: "C", explanation: "Cloud CDN = Google edge caching.", difficulty: "easy", topic: "Networking" },
    { question: "What does Persistent Disk provide?", options: { A: "Object storage", B: "Block storage for VMs", C: "File storage", D: "Cold archive" }, correct: "B", explanation: "Persistent Disk = block storage for Compute Engine.", difficulty: "easy", topic: "Storage" },
    { question: "GCP IaC tool?", options: { A: "Cloud Build", B: "Deployment Manager", C: "Cloud Source Repos", D: "Artifact Registry" }, correct: "B", explanation: "Deployment Manager = GCP IaC with YAML.", difficulty: "easy", topic: "DevOps" },
    { question: "What is VPC in GCP?", options: { A: "Virtual Private Cloud for isolated networking", B: "Virtual Processing Center", C: "Verified Public Connection", D: "Video Processing Cloud" }, correct: "A", explanation: "VPC = private isolated network.", difficulty: "medium", topic: "Networking" },
    { question: "Stateless containers without managing infra?", options: { A: "GKE", B: "Compute Engine", C: "Cloud Run", D: "App Engine" }, correct: "C", explanation: "Cloud Run = fully managed, scales to zero.", difficulty: "medium", topic: "Containers" },
    { question: "Cloud Spanner best for?", options: { A: "Document storage", B: "Global relational DB with strong consistency", C: "Time-series", D: "Object storage" }, correct: "B", explanation: "Spanner = global ACID transactions.", difficulty: "medium", topic: "Databases" },
    { question: "What is a Service Account?", options: { A: "Human user", B: "Identity for apps to call GCP APIs", C: "Billing account", D: "Project owner" }, correct: "B", explanation: "Service accounts = non-human identities.", difficulty: "medium", topic: "Security" },
    { question: "Cheapest storage class for rare access?", options: { A: "Standard", B: "Nearline", C: "Coldline", D: "Archive" }, correct: "D", explanation: "Archive = lowest cost, highest retrieval time.", difficulty: "medium", topic: "Storage" },
    { question: "What is Firestore?", options: { A: "Relational DB", B: "Managed NoSQL document DB", C: "Key-value cache", D: "Time-series DB" }, correct: "B", explanation: "Firestore = serverless document DB.", difficulty: "medium", topic: "Databases" },
    { question: "Cloud Armor provides?", options: { A: "Encryption at rest", B: "DDoS protection and WAF", C: "VPN", D: "Identity federation" }, correct: "B", explanation: "Cloud Armor = DDoS + WAF.", difficulty: "medium", topic: "Security" },
    { question: "Cloud Pub/Sub purpose?", options: { A: "DB replication", B: "Async messaging between services", C: "File sync", D: "API gateway" }, correct: "B", explanation: "Pub/Sub = managed event messaging.", difficulty: "medium", topic: "Integration" },
    { question: "Command to initialize gcloud CLI?", options: { A: "gcloud start", B: "gcloud auth", C: "gcloud init", D: "gcloud config" }, correct: "C", explanation: "gcloud init sets up account and project.", difficulty: "medium", topic: "CLI" },
    { question: "What is a Managed Instance Group?", options: { A: "Cloud SQL group", B: "Identical VMs managed for scaling", C: "GKE node pool", D: "IAM role set" }, correct: "B", explanation: "MIGs = autoscaling VM fleets.", difficulty: "medium", topic: "Compute" },
    { question: "Cloud Interconnect purpose?", options: { A: "Internal GCP connection", B: "Private high-bandwidth on-prem to GCP", C: "Connect two regions", D: "API connectivity" }, correct: "B", explanation: "Interconnect = dedicated private connectivity.", difficulty: "medium", topic: "Networking" },
    { question: "GCP data warehousing service?", options: { A: "Cloud SQL", B: "Bigtable", C: "BigQuery", D: "Datastore" }, correct: "C", explanation: "BigQuery = serverless petabyte data warehouse.", difficulty: "medium", topic: "Analytics" },
    { question: "What is Anthos?", options: { A: "Database service", B: "Multi-cloud app management platform", C: "CDN", D: "ML platform" }, correct: "B", explanation: "Anthos = consistent ops across environments.", difficulty: "medium", topic: "Hybrid" },
    { question: "Cloud KMS purpose?", options: { A: "Kubernetes mgmt", B: "Cryptographic key management", C: "Monitoring", D: "Rate limiting" }, correct: "B", explanation: "KMS manages encryption keys.", difficulty: "medium", topic: "Security" },
    { question: "What does Cloud Build do?", options: { A: "Deploy VMs", B: "CI/CD build automation", C: "Manage databases", D: "Monitor costs" }, correct: "B", explanation: "Cloud Build = CI/CD on GCP.", difficulty: "medium", topic: "DevOps" },
    { question: "Coldline vs Archive storage?", options: { A: "No difference", B: "Coldline < once/quarter; Archive < once/year", C: "Archive faster", D: "Coldline costs more" }, correct: "B", explanation: "Archive = lower cost, less frequent access.", difficulty: "hard", topic: "Storage" },
    { question: "GKE Autopilot vs Standard?", options: { A: "Autopilot manages nodes automatically", B: "Autopilot always cheaper", C: "Standard more regions", D: "No difference" }, correct: "A", explanation: "Autopilot = fully managed including nodes.", difficulty: "hard", topic: "Containers" },
    { question: "Workload Identity in GKE?", options: { A: "Assign IPs to pods", B: "Pods authenticate as GCP service accounts without keys", C: "Kubernetes RBAC", D: "Encrypt pod comms" }, correct: "B", explanation: "Workload Identity = keyless service account mapping.", difficulty: "hard", topic: "Security" },
    { question: "VPC Service Controls?", options: { A: "Firewall for VMs", B: "Perimeters preventing data exfiltration from APIs", C: "VPN config", D: "Peering rules" }, correct: "B", explanation: "VPC SC = API access perimeters.", difficulty: "hard", topic: "Security" },
    { question: "Cloud Spanner consistency model?", options: { A: "Eventual", B: "Read-your-writes", C: "External consistency", D: "Causal" }, correct: "C", explanation: "Spanner = external consistency (linearizability).", difficulty: "hard", topic: "Databases" },
  ],
};

function getQuestionsForCert(certName) {
  const lower = certName.toLowerCase();
  if (lower.includes("oracle") || lower.includes("java")) return QUESTION_BANKS.default_java;
  if (lower.includes("aws")    || lower.includes("amazon")) return QUESTION_BANKS.default_aws;
  if (lower.includes("google") || lower.includes("gcp") || lower.includes("cloud engineer")) return QUESTION_BANKS.default_gcp;
  return QUESTION_BANKS.default_java;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── POST /api/cert-exam/generate-mcq ─────────────────────────────────────────
router.post("/generate-mcq", async (req, res) => {
  try {
    const { certName } = req.body;
    if (!certName) return res.status(400).json({ error: "certName is required" });

    console.log(`[MCQ] Generating questions for: ${certName}`);

    let questions;
    let source = "offline";

    // ── Try LangChain + Cohere first ─────────────────────────────────────────
    if (process.env.COHERE_API_KEY) {
      try {
        console.log("[MCQ] Using LangChain + Cohere chain...");
        const chain  = getMCQChain();
        const output = await chain.invoke({ certName });

        console.log("[MCQ] LangChain chain executed ✅");
        const parsed = extractJSON(output);

        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length >= 10) {
          questions = parsed.questions.slice(0, 30).map((q, i) => ({ ...q, id: i + 1 }));
          source    = "langchain_cohere";
          console.log(`[MCQ] ✅ LangChain generated ${questions.length} questions`);
        } else {
          throw new Error("Not enough questions in LangChain response");
        }
      } catch (lcErr) {
        console.log(`[MCQ] ⚠️ LangChain failed: ${lcErr.message} — using offline bank`);
      }
    }

    // ── Offline fallback ──────────────────────────────────────────────────────
    if (!questions) {
      const bank = getQuestionsForCert(certName);
      questions  = shuffle(bank).slice(0, 30).map((q, i) => ({ ...q, id: i + 1 }));
      source     = "offline";
      console.log(`[MCQ] ⚡ Offline bank used (${questions.length} questions)`);
    }

    res.json({ success: true, certName, questions, source });

  } catch (err) {
    console.error("[MCQ] Fatal:", err.message);
    res.status(500).json({ error: "Failed to generate MCQs", details: err.message });
  }
});

// ─── POST /api/cert-exam/analyze-violation ─────────────────────────────────────
// Uses LangChain + Cohere for AI violation analysis
router.post("/analyze-violation", async (req, res) => {
  try {
    const { violationType, context, count = 0 } = req.body;

    if (process.env.COHERE_API_KEY) {
      try {
        const chain  = getViolationChain();
        const output = await chain.invoke({ violationType, context, count });
        const parsed = extractJSON(output);
        return res.json(parsed);
      } catch (_) {}
    }

    // Fallback responses
    const fallback = {
      no_face:         { severity: "high",   action: "flag",  message: "No face detected. Please look at the camera." },
      multiple_faces:  { severity: "high",   action: "flag",  message: "Multiple faces detected. Only you should be visible." },
      eye_gaze:        { severity: "medium", action: "warn",  message: "Please keep your eyes on the screen." },
      voice_detected:  { severity: "medium", action: "warn",  message: "Please maintain silence during the exam." },
      tab_switch:      { severity: "high",   action: "flag",  message: "Do not switch tabs during the exam." },
      fullscreen_exit: { severity: "low",    action: "warn",  message: "Please stay in fullscreen mode." },
    };
    res.json(fallback[violationType] || { severity: "low", action: "warn", message: "Please follow exam rules." });

  } catch (err) {
    res.json({ severity: "low", action: "warn", message: "Please follow exam rules." });
  }
});

module.exports = router;
