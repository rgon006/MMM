let sheetImages = [];
let currentPage = 0;
let flipCooldown = false;
let faceMatcher;
let currentVideoFrame;

// 人脸描述符数组（需提前训练或使用已有数据）
const knownDescriptors = []; 

async function setup() {
  // 加载模型
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  ]);

  // 初始化摄像头
  const video = document.getElementById('video');
  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(stream => {
      video.srcObject = stream;
      video.play();
      startDetection();
    })
    .catch(err => console.error('摄像头错误:', err));

  // 文件上传处理
  const sheetInput = document.getElementById('sheetInput');
  sheetInput.addEventListener('change', handleFileUpload);
}

async function startDetection() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const displaySize = { width: video.width, height: video.height };

  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    // 绘制检测结果
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    // 人脸识别逻辑
    if (detections.length > 0) {
      const faceDescriptor = resizedDetections[0].descriptor;
      const bestMatchIndex = faceMatcher.findBestMatch(faceDescriptor).label;
      
      if (bestMatchIndex === 'unknown') {
        // 新面孔检测逻辑（示例：显示提示）
        console.log('检测到新面孔');
      } else {
        // 已知用户触发翻页
        nextPage();
      }
    }
  }, 100);
}

function nextPage() {
  if (flipCooldown) return;
  flipCooldown = true;
  
  currentPage = (currentPage + 1) % sheetImages.length;
  showPage();
  
  setTimeout(() => {
    flipCooldown = false;
  }, 1000);
}

function showPage() {
  const display = document.getElementById('sheetDisplay');
  display.src = sheetImages[currentPage] || '';
  display.style.display = 'block';
}

async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  // 清空现有图片
  sheetImages.length = 0;
  
  // 创建人脸描述符数据库
  const labels = [];
  for (const file of files) {
    const img = await faceapi.fetchImage(URL.createObjectURL(file));
    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    
    if (detections) {
      knownDescriptors.push(detections.descriptor);
      labels.push(file.name);
    }
  }

  // 创建人脸匹配器
  faceMatcher = new faceapi.FaceMatcher(knownDescriptors, 0.6);
  
  // 更新图库
  sheetImages = Array.from(files).map(file => URL.createObjectURL(file));
  currentPage = 0;
  
  // 更新UI
  document.getElementById('viewer').style.display = 'block';
  showPage();
  
  // 释放文件输入
  event.target.value = '';
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
  setup();
});