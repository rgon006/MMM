// (保持之前的代码不变)

// 更新文件上传处理函数 - 增加视觉反馈
async function handleFileUpload(event) {
  const files = event.target.files;
  if (!files.length) return;
  
  // 清空现有图片
  sheetImages.length = 0;
  
  // 添加临时加载效果
  const uploadBtn = document.querySelector('.upload-btn');
  const originalText = uploadBtn.innerHTML;
  uploadBtn.innerHTML = '<div class="spinner"></div> Loading...';
  
  try {
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
    
    // 显示成功消息
    const successMsg = `Successfully loaded ${files.length} sheet${files.length > 1 ? 's' : ''}`;
    uploadBtn.innerHTML = `<span style="color:#27ae60">✓</span> ${successMsg}`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  } catch (error) {
    console.error('Upload error:', error);
    uploadBtn.innerHTML = `<span style="color:#e74c3c">✗</span> Upload failed`;
    setTimeout(() => {
      uploadBtn.innerHTML = originalText;
    }, 3000);
  }
}

// 更新showPage函数以显示页码
function showPage() {
  const display = document.getElementById('sheetDisplay');
  display.src = sheetImages[currentPage] || '';
  document.getElementById('pageIndicator').textContent = 
    `Page: ${currentPage + 1}/${sheetImages.length || 1}`;
}

// 其他函数保持不变...