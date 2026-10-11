// 0 → Shipped · Resume Parser
// Front-end only: pdf.js extracts text from the PDF in the browser,
// then we match it against a dictionary of common tech skills.

const SKILL_DICTIONARY = {
  // Languages
  JavaScript: ["javascript", "js", "es6"],
  TypeScript: ["typescript", "ts"],
  Python: ["python"],
  Java: ["java"],
  "C++": ["c++"],
  SQL: ["sql"],
  HTML: ["html"],
  CSS: ["css"],
  // Frontend
  React: ["react", "reactjs", "react.js"],
  "Next.js": ["next.js", "nextjs"],
  "Node.js": ["node.js", "nodejs", "node"],
  Express: ["express", "expressjs", "express.js"],
  Redux: ["redux"],
  // Backend & data
  MongoDB: ["mongodb", "mongo"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  Redis: ["redis"],
  GraphQL: ["graphql"],
  REST: ["rest", "restful"],
  // Cloud & devops
  AWS: ["aws", "amazon web services"],
  Docker: ["docker", "containerization"],
  Kubernetes: ["kubernetes", "k8s"],
  Git: ["git", "github", "gitlab"],
  CI/CD: ["ci/cd", "continuous integration", "jenkins", "github actions"],
  Linux: ["linux", "unix"],
  // Practices
  Testing: ["jest", "vitest", "pytest", "unit test", "unit testing"],
  Agile: ["agile", "scrum", "kanban"],
};

// Skills the homepage advertises = the dictionary keys themselves
const trackedList = document.getElementById("trackedList");
trackedList.innerHTML = Object.keys(SKILL_DICTIONARY)
  .map((s) => `<span class="chip">${s}</span>`)
  .join("");

// ---- element references ----
const uploadCard = document.getElementById("uploadCard");
const analyzingCard = document.getElementById("analyzingCard");
const resultsCard = document.getElementById("resultsCard");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const demoBtn = document.getElementById("demoBtn");
const uploadError = document.getElementById("uploadError");
const analyzingStep = document.getElementById("analyzingStep");
const scoreValue = document.getElementById("scoreValue");
const verdictLabel = document.getElementById("verdictLabel");
const verdictSub = document.getElementById("verdictSub");
const statPresent = document.getElementById("statPresent");
const statMissing = document.getElementById("statMissing");
const presentList = document.getElementById("presentList");
const missingList = document.getElementById("missingList");
const resetBtn = document.getElementById("resetBtn");
const ringFill = document.getElementById("ringFill");

const RING_LENGTH = 327; // circumference of r=52 circle: 2πr ≈ 326.7

// ---- state switching ----
function showCard(card) {
  [uploadCard, analyzingCard, resultsCard].forEach((c) => c.classList.add("hidden"));
  card.classList.remove("hidden");
}

// ---- upload wiring ----
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

// drag & drop
["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (file.type !== "application/pdf") {
    uploadError.textContent = "That's not a PDF — please upload a .pdf file.";
    return;
  }
  uploadError.textContent = "";
  showCard(analyzingCard);

  const reader = new FileReader();
  reader.onload = () => analyzePdf(reader.result);
  reader.onerror = () => {
    showCard(uploadCard);
    uploadError.textContent = "Couldn't read that file. Try again?";
  };
  reader.readAsArrayBuffer(file);
}

// ---- pdf parsing ----
async function analyzePdf(buffer) {
  try {
    analyzingStep.textContent = "Reading PDF…";
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    // page.textContent returns an array of text items; join them into one string
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + " ";
    }

    analyzingStep.textContent = "Matching skills…";
    await new Promise((r) => setTimeout(r, 400)); // small pause so the spinner is visible
    scoreResume(text);
  } catch (err) {
    console.error(err);
    showCard(uploadCard);
    uploadError.textContent = "Couldn't parse that PDF. Is it a text-based PDF (not a scan)?";
  }
}

// ---- scoring ----
function scoreResume(text) {
  const lower = text.toLowerCase();
  const present = [];
  const missing = [];

  for (const [skill, aliases] of Object.entries(SKILL_DICTIONARY)) {
    const found = aliases.some((alias) => lower.includes(alias));
    (found ? present : missing).push(skill);
  }

  const score = Math.round((present.length / Object.keys(SKILL_DICTIONARY).length) * 100);

  // animate score count-up
  animateScore(score);

  // verdict copy based on score bands
  let label, sub;
  if (score >= 70) {
    label = "Shipped 🚀";
    sub = "Strong skills coverage — recruiters will see a lot here.";
  } else if (score >= 40) {
    label = "Getting there";
    sub = "Solid base, but there are gaps worth closing.";
  } else {
    label = "Zero shipped";
    sub = "Lots of room to grow — check the missing skills below.";
  }
  verdictLabel.textContent = label;
  verdictSub.textContent = sub;

  statPresent.textContent = present.length;
  statMissing.textContent = missing.length;

  presentList.innerHTML = present.length
    ? present.map((s) => `<span class="chip present">✓ ${s}</span>`).join("")
    : `<span class="chip none">No tracked skills found</span>`;
  missingList.innerHTML = missing.length
    ? missing.map((s) => `<span class="chip missing">✗ ${s}</span>`).join("")
    : `<span class="chip none">Nothing missing — nice!</span>`;

  showCard(resultsCard);
}

function animateScore(score) {
  // count the number up over ~0.9s and fill the ring in sync
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    scoreValue.textContent = Math.round(score * eased);
    ringFill.style.strokeDashoffset = RING_LENGTH * (1 - (score / 100) * eased);
  }
  requestAnimationFrame(tick);
}

// ---- reset ----
resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  showCard(uploadCard);
});

// ---- sample resume (for the demo button) ----
const SAMPLE_TEXT = `Alex Rivera — Full Stack Developer
alex.rivera@example.com | github.com/alexrivera | linkedin.com/in/alexrivera

SKILLS
JavaScript, TypeScript, React, Redux, Node.js, Express, MongoDB, REST, Git, Docker, Jest, Agile

EXPERIENCE
Frontend Developer — TechCorp (2023–present)
- Built dashboards in React with Redux state management
- Wrote unit tests with Jest; shipped via GitHub Actions CI/CD

Backend Developer — StartupHub (2021–2023)
- Designed REST APIs in Node.js and Express backed by MongoDB
- Containerized services with Docker on Linux servers

EDUCATION
B.Tech Computer Science, 2021`;

demoBtn.addEventListener("click", () => {
  showCard(analyzingCard);
  analyzingStep.textContent = "Loading sample…";
  setTimeout(() => {
    analyzingStep.textContent = "Matching skills…";
    setTimeout(() => scoreResume(SAMPLE_TEXT), 400);
  }, 400);
});
