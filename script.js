// 使用全局变量替代模块导入
const faceapi = window.faceapi;

let sheetImages = [];
let currentPage = 0;
let flipCooldown = false;

async function setup() {
  // 显示加载状态
  document.getElementById('loading').style.display = 'block';
  
  try {
    // 从CDN加载模型
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@latest/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@latest/models');
    
    // 初始化摄像头
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    video.srcObject = stream;
    
    // 启动检测
    detectFaces();
  } catch (error) {
    console.error('初始化失败:', error);
    alert(`摄像头错误: ${error.message}`);
  } finally {
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
  }

  // 添加上传事件监听
  const sheetInput = document.getElementById('sheetInput');
  sheetInput.addEventListener('change', handleFileUpload);
}

function detectFaces() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const displaySize = { width: video.width, height: video.height };
  
  faceapi.matchDimensions(canvas, displaySize);
  
  // 人脸检测循环
  setInterval(async () => {
    if (!video.readyState) return;
    
    // 检测人脸的代码...
    const detections = await faceapi.detectAllFaces(
      video, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks();
    
    // 清空画布
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制检测结果
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    
    // 检测张嘴动作
    for (const detection of resizedDetections) {
      const landmarks = detection.landmarks;
      const topLip = landmarks.getTopLip();
      const bottomLip = landmarks.getBottomLip();
      const mouthHeight = bottomLip[0].y - topLip[0].y;
      
      // 张嘴检测
      if (mouthHeight > 15) {
        nextPage();
        break;
      }
    }
  }, 300); // 每300ms检测一次
}

// 文件上传处理函数
async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  // 更新按钮状态
  const uploadBtn = document.querySelector('.upload-btn');
  const originalText = uploadBtn.innerHTML;
  uploadBtn.innerHTML = '<div class="spinner"></div> Processing...';
  
  try {
    // 清除旧图片
    sheetImages.forEach(url => URL.revokeObjectURL(url));
    sheetImages = [];
    
    // 处理每张图片
    for (const file of files) {
      const imgUrl = URL.createObjectURL(file);
      sheetImages.push(imgUrl);
    }
    
    // 显示第一页
    currentPage = 0;
    document.getElementById('viewer').style.display = 'block';
    showPage();
    
    // 显示成功消息
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

// 显示当前页面
function showPage() {
  const display = document.getElementById('sheetDisplay');
  const pageIndicator = document.getElementById('pageIndicator');
  
  if (sheetImages.length > 0 && currentPage < sheetImages.length) {
    display.src = sheetImages[currentPage];
    display.style.display = 'block';
    pageIndicator.textContent = `Page: ${currentPage + 1}/${sheetImages.length}`;
  } else {
    display.style.display = 'none';
    pageIndicator.textContent = 'No sheets loaded';
  }
}

// 翻到下一页
function nextPage() {
  if (sheetImages.length === 0 || flipCooldown) return;
  
  flipCooldown = true;
  currentPage = (currentPage + 1) % sheetImages.length;
  showPage();
  
  setTimeout(() => {
    flipCooldown = false;
  }, 1000); // 1秒翻页冷却
}

// 页面加载完成后启动
document.addEventListener('DOMContentLoaded', setup);