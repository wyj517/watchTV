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

// 缓存变量
let lastScanTime = 0;
const SCAN_INTERVAL = 3600000; // 1小时，单位毫秒

// 搜索结果缓存
const searchCache = new Map();
const SEARCH_CACHE_TTL = 300000; // 5分钟，单位毫秒

// 缓存项结构：{ results: [], timestamp: number }

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

// 扫描单个视频文件夹
function scanSingleVideo(folderName) {
  const folderPath = path.join(VIDEO_ROOT_DIR, folderName);
  const files = fs.readdirSync(folderPath);
  
  // 查找第一个视频文件
  const videoFile = files.find(file => 
    ['.mp4', '.avi', '.mkv', '.mov'].includes(path.extname(file).toLowerCase())
  );
  
  if (!videoFile) return null;
  
  // 查找第一个图片文件作为封面
  const coverFile = files.find(file => 
    ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
  );
  
  // 读取标签文件
  const tags = readTagsFromFile(folderPath);
  
  return {
    id: folderName,
    name: folderName,
    videoUrl: `http://localhost:${PORT}/videos/${folderName}/${videoFile}`,
    coverUrl: coverFile ? `http://localhost:${PORT}/videos/${folderName}/${coverFile}` : null,
    tags: tags,
    createdAt: new Date().toISOString()
  };
}

// 扫描目录获取视频和封面 - 优化版
function scanVideos(forceRescan = false) {
  // 检查是否需要重新扫描
  const now = Date.now();
  if (!forceRescan && now - lastScanTime < SCAN_INTERVAL) {
    // 返回缓存数据
    return getVideoData();
  }
  
  console.log('Scanning videos...');
  const startTime = Date.now();
  const videos = [];
  
  // 读取所有子文件夹
  const videoFolders = fs.readdirSync(VIDEO_ROOT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  videoFolders.forEach(folderName => {
    const video = scanSingleVideo(folderName);
    if (video) {
      videos.push(video);
    }
  });
  
  // 保存到JSON文件，用于快速查询
  saveVideoData(videos);
  lastScanTime = now;
  
  const endTime = Date.now();
  console.log(`Video scan completed in ${endTime - startTime}ms. Found ${videos.length} videos.`);
  
  return videos;
}

// 手动触发重新扫描
app.get('/api/videos/rescan', (req, res) => {
  const videos = scanVideos(true);
  res.json({
    message: 'Rescan completed',
    videoCount: videos.length
  });
});

// 静态文件服务 - 直接映射到视频根目录
app.use('/videos', express.static(VIDEO_ROOT_DIR));

// API 路由

// 获取视频列表
app.get('/api/videos', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  // 只在第一次请求或有更新时扫描视频
  let videos = getVideoData();
  if (videos.length === 0) {
    videos = scanVideos();
  }
  
  // 分页处理
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedVideos = videos.slice(startIndex, endIndex);
  
  res.json({
    videos: paginatedVideos,
    pagination: {
      currentPage: pageNum,
      pageSize: limitNum,
      totalCount: videos.length,
      totalPages: Math.ceil(videos.length / limitNum)
    }
  });
});

// 搜索视频
app.get('/api/videos/search', (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  let videos = getVideoData();
  if (videos.length === 0) {
    videos = scanVideos();
  }
  
  let results = videos;
  if (q) {
    // 生成缓存键
    const cacheKey = q.toLowerCase();
    const now = Date.now();
    
    // 检查缓存
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (now - cached.timestamp < SEARCH_CACHE_TTL) {
        // 使用缓存结果
        results = cached.results;
      } else {
        // 缓存过期，移除
        searchCache.delete(cacheKey);
      }
    }
    
    // 如果没有缓存或缓存过期，执行搜索
    if (!searchCache.has(cacheKey)) {
      const searchTerm = q.toLowerCase();
      results = videos.filter(video => 
        video.name.toLowerCase().includes(searchTerm) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
      
      // 存入缓存
      searchCache.set(cacheKey, {
        results: results,
        timestamp: now
      });
    }
  }
  
  // 分页处理
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedResults = results.slice(startIndex, endIndex);
  
  res.json({
    videos: paginatedResults,
    pagination: {
      currentPage: pageNum,
      pageSize: limitNum,
      totalCount: results.length,
      totalPages: Math.ceil(results.length / limitNum)
    }
  });
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
  
  // 更新JSON文件，不需要重新扫描所有视频
  let videos = getVideoData();
  const videoIndex = videos.findIndex(v => v.id === id);
  if (videoIndex !== -1) {
    videos[videoIndex].tags = tags;
    saveVideoData(videos);
  }
  
  // 清除相关搜索缓存
  searchCache.clear();
  
  res.json(videos[videoIndex]);
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
  
  // 更新JSON文件，不需要重新扫描所有视频
  let videos = getVideoData();
  const videoIndex = videos.findIndex(v => v.id === id);
  if (videoIndex !== -1) {
    videos[videoIndex].tags = tags;
    saveVideoData(videos);
  }
  
  // 清除相关搜索缓存
  searchCache.clear();
  
  res.json(videos[videoIndex]);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Videos directory: ${VIDEO_ROOT_DIR}`);
});