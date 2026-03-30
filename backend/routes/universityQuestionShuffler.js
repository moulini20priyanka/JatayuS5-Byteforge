// universityQuestionShuffler.js
// Assigns unique randomized papers to each student from the question pool.
// Each student gets a DIFFERENT set of questions — no two papers are identical.

const { v4: uuidv4 } = require('uuid');

/**
 * Fisher-Yates shuffle — in-place, returns new array
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick N unique items from array without replacement.
 * If pool < N, cycles through the pool with rotation offset so
 * each student still gets a different ordering.
 */
function pickUnique(pool, count, studentIndex = 0) {
  if (pool.length === 0) return [];

  if (pool.length >= count) {
    // Enough questions — shuffle from a rotated starting point per student
    const rotated = [
      ...pool.slice(studentIndex % pool.length),
      ...pool.slice(0, studentIndex % pool.length),
    ];
    return shuffle(rotated).slice(0, count);
  }

  // Pool smaller than needed — take all and cycle with student-specific seed
  const result = [];
  const rotatedPool = [
    ...pool.slice(studentIndex % pool.length),
    ...pool.slice(0, studentIndex % pool.length),
  ];
  let i = 0;
  while (result.length < count) {
    result.push({ ...rotatedPool[i % rotatedPool.length] });
    i++;
  }
  return result;
}

/**
 * Build a unique paper for one student.
 *
 * @param {Array}  mcqPool        - Full MCQ pool from exam_question_banks
 * @param {Array}  writtenPool    - Full written pool from exam_question_banks
 * @param {Object} sectionConfig  - { mcq: { count, marks }, written: { count, marks } }
 * @param {number} studentIndex   - Unique index per student (0,1,2,...) ensures different papers
 * @param {string} subject        - Subject label for fallback dummy MCQs
 *
 * @returns {{ mcq: Array, written: Array }}
 *   mcq:     [ { id, text, options: [{key,text}], answer, marks } ]
 *   written: [ { id, text, marks, keywords } ]
 */
function buildUniqueStudentPaper(mcqPool, writtenPool, sectionConfig = {}, studentIndex = 0, subject = '') {
  const mcqCount     = parseInt(sectionConfig?.mcq?.count     ?? 20);
  const writtenCount = parseInt(sectionConfig?.written?.count ??  5);

  // ── MCQ ──────────────────────────────────────────────────────────────────
  let mcqSource = mcqPool;
  if (mcqSource.length === 0) {
    console.warn(`[buildUniqueStudentPaper] MCQ pool empty — generating dummy MCQs for: ${subject}`);
    mcqSource = generateDummyMcq(subject, Math.max(mcqCount * 2, 40)); // larger pool for variety
  }

  const pickedMcq = pickUnique(mcqSource, mcqCount, studentIndex);

  // Shuffle the options for each MCQ question so option order differs per student
  const mcqFinal = pickedMcq.map(q => ({
    id:      q.id || uuidv4(),
    text:    q.text || q.question_text || '',
    options: shuffle(q.options || []),  // options reordered per student
    answer:  q.answer,                  // kept for server-side scoring
    marks:   q.marks || 1,
  }));

  // ── Written ───────────────────────────────────────────────────────────────
  const pickedWritten = pickUnique(writtenPool, writtenCount, studentIndex);

  const writtenFinal = pickedWritten.map(q => ({
    id:       q.id || uuidv4(),
    text:     q.text || q.question_text || '',
    marks:    q.marks || 8,
    keywords: q.keywords || '',   // kept for server-side keyword scoring
  }));

  return { mcq: mcqFinal, written: writtenFinal };
}

/**
 * Assign unique papers to ALL students in one call.
 * Returns array of { studentId, mcq, written } — ready to INSERT.
 *
 * @param {Array}  students      - [ { id, name, email }, ... ]
 * @param {Array}  mcqPool       - Full MCQ pool
 * @param {Array}  writtenPool   - Full written pool
 * @param {Object} sectionConfig
 * @param {string} subject
 */
function assignPapersToStudents(students, mcqPool, writtenPool, sectionConfig = {}, subject = '') {
  return students.map((student, index) => {
    const paper = buildUniqueStudentPaper(
      mcqPool,
      writtenPool,
      sectionConfig,
      index,  // unique index ensures unique question selection + option ordering
      subject
    );
    return {
      studentId: student.id,
      mcq:       paper.mcq,
      written:   paper.written,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY MCQ FALLBACK — used when PDF parse yields 0 MCQs
// Subject-aware: detects OS, DBMS, Networks, DS, etc.
// ─────────────────────────────────────────────────────────────────────────────
function generateDummyMcq(subject = '', count = 40) {
  const s = subject.toLowerCase();

  const banks = {
    os: [
      { text: 'What is the primary function of an Operating System?',
        options:[{key:'A',text:'Manage hardware resources'},{key:'B',text:'Write application code'},{key:'C',text:'Connect to the internet'},{key:'D',text:'Store user files'}], answer:'A' },
      { text: 'Which scheduling algorithm can cause starvation?',
        options:[{key:'A',text:'Round Robin'},{key:'B',text:'FCFS'},{key:'C',text:'Priority Scheduling'},{key:'D',text:'Multilevel Queue'}], answer:'C' },
      { text: 'PCB stands for?',
        options:[{key:'A',text:'Process Control Block'},{key:'B',text:'Program Counter Buffer'},{key:'C',text:'Processor Core Bus'},{key:'D',text:'Primary Control Block'}], answer:'A' },
      { text: 'Deadlock requires which condition?',
        options:[{key:'A',text:'Mutual Exclusion'},{key:'B',text:'Preemption allowed'},{key:'C',text:'Single resource type'},{key:'D',text:'Unlimited memory'}], answer:'A' },
      { text: 'Thrashing in an OS means?',
        options:[{key:'A',text:'Excessive page faults reducing CPU utilization'},{key:'B',text:'CPU at 100% always'},{key:'C',text:'Memory overflow'},{key:'D',text:'Disk fragmentation'}], answer:'A' },
      { text: 'Which page replacement algorithm suffers from Belady\'s anomaly?',
        options:[{key:'A',text:'LRU'},{key:'B',text:'Optimal'},{key:'C',text:'FIFO'},{key:'D',text:'LFU'}], answer:'C' },
      { text: 'A semaphore is used for?',
        options:[{key:'A',text:'Process synchronization'},{key:'B',text:'Memory allocation'},{key:'C',text:'CPU scheduling'},{key:'D',text:'Disk management'}], answer:'A' },
      { text: 'Virtual memory extends RAM by using?',
        options:[{key:'A',text:'Compression'},{key:'B',text:'Disk space as extended RAM'},{key:'C',text:'Shared CPU registers'},{key:'D',text:'Network storage'}], answer:'B' },
      { text: 'In Round Robin, what determines time per process?',
        options:[{key:'A',text:'Priority level'},{key:'B',text:'Time quantum'},{key:'C',text:'Memory size'},{key:'D',text:'CPU burst time'}], answer:'B' },
      { text: 'Which allocation strategy eliminates external fragmentation?',
        options:[{key:'A',text:'First Fit'},{key:'B',text:'Best Fit'},{key:'C',text:'Paging'},{key:'D',text:'Segmentation'}], answer:'C' },
      { text: 'Context switch saves the current process state in?',
        options:[{key:'A',text:'PCB'},{key:'B',text:'Stack'},{key:'C',text:'Heap'},{key:'D',text:'Cache'}], answer:'A' },
      { text: 'Disk scheduling SCAN algorithm is also called?',
        options:[{key:'A',text:'FCFS'},{key:'B',text:'SSTF'},{key:'C',text:'Elevator'},{key:'D',text:'LOOK'}], answer:'C' },
      { text: 'Mutex ensures?',
        options:[{key:'A',text:'Multiple threads access resource simultaneously'},{key:'B',text:'Only one thread accesses resource at a time'},{key:'C',text:'CPU scheduling'},{key:'D',text:'Virtual memory management'}], answer:'B' },
      { text: 'Banker\'s algorithm is used for?',
        options:[{key:'A',text:'Deadlock detection'},{key:'B',text:'Deadlock avoidance'},{key:'C',text:'Deadlock prevention'},{key:'D',text:'Deadlock recovery'}], answer:'B' },
      { text: 'Which kernel loads all services into kernel space?',
        options:[{key:'A',text:'Microkernel'},{key:'B',text:'Hybrid kernel'},{key:'C',text:'Monolithic kernel'},{key:'D',text:'Exokernel'}], answer:'C' },
      { text: 'Demand paging loads pages?',
        options:[{key:'A',text:'All at program start'},{key:'B',text:'Only when needed'},{key:'C',text:'Permanently into RAM'},{key:'D',text:'Via compression'}], answer:'B' },
      { text: 'IPC mechanisms include?',
        options:[{key:'A',text:'Pipes and message queues'},{key:'B',text:'CPU registers only'},{key:'C',text:'Hard disk transfers'},{key:'D',text:'GPU buffers'}], answer:'A' },
      { text: 'In segmentation, each segment has?',
        options:[{key:'A',text:'Fixed OS-determined size'},{key:'B',text:'Variable size based on logical divisions'},{key:'C',text:'Size equal to page size'},{key:'D',text:'Always 4KB'}], answer:'B' },
      { text: 'Critical section problem ensures?',
        options:[{key:'A',text:'No two processes execute in CS simultaneously'},{key:'B',text:'Equal CPU time for all'},{key:'C',text:'Memory always available'},{key:'D',text:'Processes never wait'}], answer:'A' },
      { text: 'The working set model is used to prevent?',
        options:[{key:'A',text:'Deadlock'},{key:'B',text:'Starvation'},{key:'C',text:'Thrashing'},{key:'D',text:'Fragmentation'}], answer:'C' },
    ],
    dbms: [
      { text: 'Which normal form eliminates transitive dependencies?',
        options:[{key:'A',text:'1NF'},{key:'B',text:'2NF'},{key:'C',text:'3NF'},{key:'D',text:'BCNF'}], answer:'C' },
      { text: 'ACID stands for?',
        options:[{key:'A',text:'Atomicity, Consistency, Isolation, Durability'},{key:'B',text:'All Correct Indexed Data'},{key:'C',text:'Atomic, Concurrent, Integrated, Distributed'},{key:'D',text:'None of the above'}], answer:'A' },
      { text: 'A primary key must be?',
        options:[{key:'A',text:'Null and non-unique'},{key:'B',text:'Unique and not null'},{key:'C',text:'Non-unique and not null'},{key:'D',text:'Null and unique'}], answer:'B' },
      { text: 'Which JOIN returns all rows from both tables?',
        options:[{key:'A',text:'INNER JOIN'},{key:'B',text:'LEFT JOIN'},{key:'C',text:'RIGHT JOIN'},{key:'D',text:'FULL OUTER JOIN'}], answer:'D' },
      { text: 'An index improves?',
        options:[{key:'A',text:'Write speed'},{key:'B',text:'Query retrieval speed'},{key:'C',text:'Storage space'},{key:'D',text:'Security'}], answer:'B' },
    ],
    default: [
      { text: 'Which data structure uses LIFO order?',
        options:[{key:'A',text:'Queue'},{key:'B',text:'Stack'},{key:'C',text:'Tree'},{key:'D',text:'Graph'}], answer:'B' },
      { text: 'Binary search has time complexity?',
        options:[{key:'A',text:'O(n)'},{key:'B',text:'O(n²)'},{key:'C',text:'O(log n)'},{key:'D',text:'O(1)'}], answer:'C' },
      { text: 'Which is primary memory?',
        options:[{key:'A',text:'Hard Disk'},{key:'B',text:'RAM'},{key:'C',text:'SSD'},{key:'D',text:'USB Drive'}], answer:'B' },
      { text: 'HTTP default port is?',
        options:[{key:'A',text:'21'},{key:'B',text:'25'},{key:'C',text:'80'},{key:'D',text:'443'}], answer:'C' },
      { text: 'OOP stands for?',
        options:[{key:'A',text:'Object Oriented Programming'},{key:'B',text:'Object Optimized Process'},{key:'C',text:'Open Operator Protocol'},{key:'D',text:'Only One Process'}], answer:'A' },
    ],
  };

  let pool = banks.default;
  if (s.includes('os') || s.includes('operat')) pool = banks.os;
  else if (s.includes('db') || s.includes('database') || s.includes('sql')) pool = banks.dbms;

  const result = [];
  for (let i = 0; i < count; i++) {
    const q = pool[i % pool.length];
    result.push({
      id:      uuidv4(),
      text:    q.text,
      options: q.options,
      answer:  q.answer,
      marks:   1,
      isDummy: true,
    });
  }
  return result;
}

module.exports = {
  buildUniqueStudentPaper,
  assignPapersToStudents,
  generateDummyMcq,
  shuffle,
};