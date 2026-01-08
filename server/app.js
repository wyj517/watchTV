const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// 配置 CORS
app.use(cors());
app.use(express.json());

// 视频和封面存储目录
const VIDEO_ROOT_DIR = path.join(__dirname, 'videos');
const DATA_FILE = path.join(__dirname, 'videoData.json');

// 确保根目录存在
if (!fs.existsSync(VIDEO_ROOT_DIR)) fs.mkdirSync(VIDEO_ROOT_DIR, { recursive: true });

// 初始化视频数据文件
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// 获取视频数据
function getVideoData() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// 保存视频数据
function saveVideoData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 读取视频文件夹中的标签文件
function readTagsFromFile(folderPath) {
  const tagFilePath = path.join(folderPath, 'tags.txt');
  if (fs.existsSync(tagFilePath)) {
    try {
      const content = fs.readFileSync(tagFilePath, 'utf8');
      return content.split('\n')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } catch (error) {
      console.error(`Error reading tags from ${tagFilePath}:`, error);
      return [];
    }
  }
  return [];
}

// 保存标签到视频文件夹中的标签文件
function saveTagsToFile(folderPath, tags) {
  const tagFilePath = path.join(folderPath, 'tags.txt');
  try {
    fs.writeFileSync(tagFilePath, tags.join('\n'), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving tags to ${tagFilePath}:`, error);
    return false;
  }
}

// 扫描目录获取视频和封面
function scanVideos() {
  const videos = [];
  
  // 读取所有子文件夹
  const videoFolders = fs.readdirSync(VIDEO_ROOT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  videoFolders.forEach(folderName => {
    const folderPath = path.join(VIDEO_ROOT_DIR, folderName);
    const files = fs.readdirSync(folderPath);
    
    // 查找第一个视频文件
    const videoFile = files.find(file => 
      ['.mp4', '.avi', '.mkv', '.mov'].includes(path.extname(file).toLowerCase())
    );
    
    // 查找第一个图片文件作为封面
    const coverFile = files.find(file => 
      ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
    );
    
    // 读取标签文件
    const tags = readTagsFromFile(folderPath);
    
    if (videoFile) {
      videos.push({
        id: folderName,
        name: folderName,
        videoUrl: `http://localhost:${PORT}/videos/${folderName}/${videoFile}`,
        coverUrl: coverFile ? `http://localhost:${PORT}/videos/${folderName}/${coverFile}` : null,
        tags: tags,
        createdAt: new Date().toISOString()
      });
    }
  });
  
  // 保存到JSON文件，用于快速查询
  saveVideoData(videos);
  return videos;
}

// 静态文件服务 - 直接映射到视频根目录
app.use('/videos', express.static(VIDEO_ROOT_DIR));

// API 路由

// 获取视频列表
app.get('/api/videos', (req, res) => {
  const videos = scanVideos();
  res.json(videos);
});

// 搜索视频
app.get('/api/videos/search', (req, res) => {
  const { q } = req.query;
  const videos = getVideoData();
  
  if (!q) {
    return res.json(videos);
  }
  
  const searchTerm = q.toLowerCase();
  const results = videos.filter(video => 
    video.name.toLowerCase().includes(searchTerm) ||
    (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
  );
  
  res.json(results);
});

// 获取单个视频信息
app.get('/api/videos/:id', (req, res) => {
  const { id } = req.params;
  const videos = getVideoData();
  const video = videos.find(v => v.id === id);
  
  if (video) {
    res.json(video);
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// 添加标签
app.post('/api/videos/:id/tags', (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;
  
  if (!tag) {
    return res.status(400).json({ error: 'Tag is required' });
  }
  
  const folderPath = path.join(VIDEO_ROOT_DIR, id);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // 读取当前标签
  let tags = readTagsFromFile(folderPath);
  
  // 添加新标签（去重）
  if (!tags.includes(tag)) {
    tags.push(tag);
    saveTagsToFile(folderPath, tags);
  }
  
  // 重新扫描视频，更新JSON文件
  const videos = scanVideos();
  const updatedVideo = videos.find(v => v.id === id);
  
  res.json(updatedVideo);
});

// 删除标签
app.delete('/api/videos/:id/tags/:tag', (req, res) => {
  const { id, tag } = req.params;
  
  const folderPath = path.join(VIDEO_ROOT_DIR, id);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // 读取当前标签
  let tags = readTagsFromFile(folderPath);
  
  // 删除指定标签
  const originalLength = tags.length;
  tags = tags.filter(t => t !== tag);
  
  // 如果标签数量有变化，保存更新
  if (tags.length !== originalLength) {
    saveTagsToFile(folderPath, tags);
  }
  
  // 重新扫描视频，更新JSON文件
  const videos = scanVideos();
  const updatedVideo = videos.find(v => v.id === id);
  
  res.json(updatedVideo);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Videos directory: ${VIDEO_ROOT_DIR}`);
});