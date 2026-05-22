const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const runButton = document.querySelector("#runButton");
const clearButton = document.querySelector("#clearButton");
const csvButton = document.querySelector("#csvButton");
const resultsGrid = document.querySelector("#resultsGrid");
const resultTemplate = document.querySelector("#resultTemplate");
const runState = document.querySelector("#runState");
const modelStatus = document.querySelector("#modelStatus");
const imageCount = document.querySelector("#imageCount");
const avgConfidence = document.querySelector("#avgConfidence");
const avgLatency = document.querySelector("#avgLatency");

let images = [];
let results = [];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const imageFiles = [...fileList].filter((file) => file.type.startsWith("image/"));
  const loaded = await Promise.all(
    imageFiles.map(async (file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
      result: null,
      error: null,
    })),
  );

  images = [...images, ...loaded];
  results = [];
  renderPlaceholders();
  updateControls();
}

function updateControls() {
  imageCount.textContent = images.length;
  runButton.disabled = images.length === 0;
  clearButton.disabled = images.length === 0;
  csvButton.disabled = results.length === 0;
}

function renderPlaceholders() {
  resultsGrid.innerHTML = "";
  if (images.length === 0) {
    runState.textContent = "No images tested yet";
    avgConfidence.textContent = "-";
    avgLatency.textContent = "-";
    return;
  }

  runState.textContent = `${images.length} image${images.length === 1 ? "" : "s"} waiting`;
  for (const image of images) {
    resultsGrid.appendChild(renderCard(image));
  }
}

function renderCard(image) {
  const node = resultTemplate.content.firstElementChild.cloneNode(true);
  const preview = node.querySelector(".preview");
  const topLabel = node.querySelector(".top-label");
  const confidence = node.querySelector(".confidence");
  const meta = node.querySelector(".meta");
  const bars = node.querySelector(".bars");

  preview.src = image.dataUrl;
  preview.alt = image.name;

  if (image.error) {
    topLabel.textContent = "Could not test";
    confidence.textContent = "";
    meta.textContent = image.error;
    node.classList.add("error");
    return node;
  }

  if (!image.result) {
    topLabel.textContent = "Waiting";
    confidence.textContent = "";
    meta.textContent = image.name;
    bars.innerHTML = "";
    return node;
  }

  const result = image.result;
  topLabel.textContent = titleCase(result.topLabel);
  confidence.textContent = `${Math.round(result.topScore * 100)}%`;
  meta.textContent = `${image.name} | ${Math.round(result.latencyMs)} ms | ${result.input.modelWidth}x${result.input.modelHeight}`;

  for (const prediction of result.predictions) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${titleCase(prediction.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width: ${prediction.score * 100}%"></div></div>
      <strong>${Math.round(prediction.score * 100)}%</strong>
    `;
    bars.appendChild(row);
  }

  return node;
}

async function runPredictions() {
  runButton.disabled = true;
  modelStatus.textContent = "Testing images";
  runState.textContent = "Running...";
  results = [];

  for (const image of images) {
    image.error = null;
    image.result = null;
  }
  renderPlaceholders();

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    runState.textContent = `Testing ${index + 1} of ${images.length}`;
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.dataUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Prediction failed");
      }
      image.result = data;
      results.push({ image, data });
    } catch (error) {
      image.error = error.message;
    }
    repaintResults();
  }

  summarizeResults();
  modelStatus.textContent = "Ready for images";
  runState.textContent = `Tested ${results.length} of ${images.length}`;
  updateControls();
}

function repaintResults() {
  resultsGrid.innerHTML = "";
  for (const image of images) {
    resultsGrid.appendChild(renderCard(image));
  }
}

function summarizeResults() {
  if (results.length === 0) {
    avgConfidence.textContent = "-";
    avgLatency.textContent = "-";
    return;
  }

  const confidence = results.reduce((sum, item) => sum + item.data.topScore, 0) / results.length;
  const latency = results.reduce((sum, item) => sum + item.data.latencyMs, 0) / results.length;
  avgConfidence.textContent = `${Math.round(confidence * 100)}%`;
  avgLatency.textContent = `${Math.round(latency)} ms`;
}

function exportCsv() {
  const header = ["file", "prediction", "confidence", "latency_ms"];
  const rows = results.map(({ image, data }) => [
    image.name,
    data.topLabel,
    data.topScore.toFixed(4),
    data.latencyMs.toFixed(1),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ripeye-model-test.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function titleCase(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

fileInput.addEventListener("change", (event) => addFiles(event.target.files));
runButton.addEventListener("click", runPredictions);
clearButton.addEventListener("click", () => {
  images = [];
  results = [];
  fileInput.value = "";
  renderPlaceholders();
  updateControls();
});
csvButton.addEventListener("click", exportCsv);

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}

dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

renderPlaceholders();
updateControls();
