const faceapi = window.faceapi;

let sheetImages = [];
let currentPage = 0;
let flipCooldown = false;

async function setup() {
  document.getElementById('loading').style.display = 'block';
  
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    video.srcObject = stream;
    
    detectFaces();
  } catch (error) {
    console.error('初始化失败:', error);
    alert(`摄像头错误: ${error.message}`);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }

  const sheetInput = document.getElementById('sheetInput');
  sheetInput.addEventListener('change', handleFileUpload);
}

function detectFaces() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const displaySize = { width: video.width, height: video.height };
  
  faceapi.matchDimensions(canvas, displaySize);
  
  setInterval(async () => {
    if (video.readyState !== 4) return;
    
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    
    for (const detection of resizedDetections) {
      const landmarks = detection.landmarks;
      const topLip = landmarks.getTopLip();
      const bottomLip = landmarks.getBottomLip();
      const mouthHeight = bottomLip[0].y - topLip[0].y;
      
      if (mouthHeight > 15) {
        nextPage();
        break;
      }
    }
  }, 300);
}

async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;

  const uploadBtn = document.querySelector('.upload-btn');
  const originalText = uploadBtn.innerHTML;
  uploadBtn.innerHTML = '<div class="spinner"></div> Processing...';
  
  try {
    sheetImages.forEach(url => URL.revokeObjectURL(url));
    sheetImages = [];
    
    for (const file of files) {
      const imgUrl = URL.createObjectURL(file);
      sheetImages.push(imgUrl);
    }
    
    currentPage = 0;
    showPage();
    
    uploadBtn.innerHTML = `<span style="color:#27ae60">✓</span> Loaded ${files.length} sheet${files.length > 1 ? 's' : ''}`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  } catch (error) {
    console.error('上传失败:', error);
    uploadBtn.innerHTML = `<span style="color:#e74c3c">✗</span> Upload failed`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  }
}

function showPage() {
  const display = document.getElementById('sheetDisplay');
  const pageIndicator = document.getElementById('pageIndicator');
  
  if (sheetImages.length > 0 && currentPage < sheetImages.length) {
    const imgElement = document.createElement('img');
    imgElement.src = sheetImages[currentPage];
    imgElement.style.width = '100%';
    display.innerHTML = '';
    display.appendChild(imgElement);
    pageIndicator.textContent = `Page: ${currentPage + 1}/${sheetImages.length}`;
  } else {
    display.innerHTML = 'No sheets loaded';
    pageIndicator.textContent = '';
  }
}

function nextPage() {
  if (sheetImages.length === 0 || flipCooldown) return;
  
  flipCooldown = true;
  currentPage = (currentPage + 1) % sheetImages.length;
  showPage();
  
  setTimeout(() => {
    flipCooldown = false;
  }, 1000);
}

document.addEventListener('DOMContentLoaded', setup);