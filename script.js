let sheetImages = [];
let currentPage = 0;
let flipCooldown = false;

async function setup() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('models');

  const video = document.getElementById('video');
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => video.srcObject = stream);

  video.addEventListener('play', () => {
    const canvas = document.getElementById('overlay');
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
      const resized = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      for (let d of resized) {
        const mouth = d.landmarks.getMouth();
        const topLipY = mouth[13].y;
        const bottomLipY = mouth[19].y;

        if ((bottomLipY - topLipY) > 20 && !flipCooldown) {
          nextPage();
          flipCooldown = true;
          setTimeout(() => flipCooldown = false, 2000);  // Cooldown
        }
      }
    }, 300);
  });

  const sheetInput = document.getElementById("sheetInput");
  sheetInput.addEventListener("change", (e) => {
    sheetImages = Array.from(e.target.files).map(file => URL.createObjectURL(file));
    currentPage = 0;
    showPage();
  });
}

function showPage() {
  if (sheetImages.length > 0) {
    document.getElementById("sheetDisplay").src = sheetImages[currentPage];
  }
}

function nextPage() {
  if (sheetImages.length > 0) {
    currentPage = (currentPage + 1) % sheetImages.length;
    showPage();
  }
}

setup();