const video = document.getElementById('video');
const imgElement = document.getElementById('currentImage');
const fileInput = document.getElementById('fileInput');

let images = [];
let currentIndex = 0;

// 1. 加载 face-api.js 模型
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error('摄像头启动失败:', err));
}

// 2. 上传图片并显示第一张
fileInput.addEventListener('change', (event) => {
  images = Array.from(event.target.files).map(file => URL.createObjectURL(file));
  currentIndex = 0;
  displayCurrentImage();
});

function displayCurrentImage() {
  if (images.length > 0 && currentIndex < images.length) {
    imgElement.src = images[currentIndex];
  }
}

// 3. 实时监测面部特征
video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (detections) {
      const landmarks = detections.landmarks;

      const mouth = landmarks.getMouth();
      const eyeLeft = landmarks.getLeftEye();
      const eyeRight = landmarks.getRightEye();

      // 判断嘴巴是否张开（上下嘴唇的距离）
      const mouthOpen = mouth[14].y - mouth[18].y > 15;
      const blink = eyeLeft[1].y - eyeLeft[5].y < 3 && eyeRight[1].y - eyeRight[5].y < 3;

      if (mouthOpen || blink) {
        currentIndex = Math.min(currentIndex + 1, images.length - 1);
        displayCurrentImage();
      }
    }
  }, 1000);
});
