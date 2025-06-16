let sheetImages = [];
let currentPage = 0;

async function setup() {
  document.getElementById('loading').style.display = 'block';
  
  try {
    // 加载模型
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@latest/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@latest/models')
    ]);

    // 初始化摄像头
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    video.srcObject = stream;
    video.play();
    
    // 启动检测
    detectFaces();
  } catch (error) {
    console.error('初始化错误:', error);
    alert(`初始化失败: ${error.message}`);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }

  // 添加上传事件监听
  const sheetInput = document.getElementById('sheetInput');
  sheetInput.addEventListener('change', handleFileUpload);
}

async function detectFaces() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  
  setInterval(async () => {
    if (!video.readyState) return;
    
    try {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 检测人脸
      const detections = await faceapi.detectAllFaces(
        video, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      
      // 检测张嘴动作
      for (const detection of resizedDetections) {
        const landmarks = detection.landmarks;
        const topLip = landmarks.getTopLip();
        const bottomLip = landmarks.getBottomLip();
        const mouthHeight = bottomLip[0].y - topLip[0].y;
        
        // 张嘴检测阈值
        if (mouthHeight > 15) {
          nextPage();
          break; // 检测到一张嘴动作就翻页
        }
      }
    } catch (error) {
      console.log('检测跳过:', error);
    }
  }, 300); // 每300ms检测一次
}

// 修正的图片上传处理函数
async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  // 清除旧图片
  sheetImages.forEach(url => URL.revokeObjectURL(url));
  sheetImages = [];
  
  // 更新按钮状态
  const uploadBtn = document.querySelector('.upload-btn');
  const originalText = uploadBtn.innerHTML;
  uploadBtn.innerHTML = '<div class="spinner"></div> Processing...';
  
  try {
    // 处理每张图片
    for (const file of files) {
      // 生成临时URL
      const imgUrl = URL.createObjectURL(file);
      sheetImages.push(imgUrl);
      
      // 预加载图片 (可选)
      await new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.src = imgUrl;
      });
    }
    
    // 显示第一页
    currentPage = 0;
    document.getElementById('viewer').style.display = 'block';
    showPage();
    
    // 显示成功消息
    uploadBtn.innerHTML = `<span style="color:#27ae60">✓</span> Loaded ${files.length} sheet(s)`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  } catch (error) {
    console.error('上传错误:', error);
    uploadBtn.innerHTML = `<span style="color:#e74c3c">✗</span> Upload failed`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  }
}

// 修正的页面显示函数
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

function nextPage() {
  if (sheetImages.length === 0) return;
  
  currentPage = (currentPage + 1) % sheetImages.length;
  showPage();
}

// 初始化
window.addEventListener('DOMContentLoaded', setup);