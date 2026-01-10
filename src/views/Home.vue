<template>
  <div class="home">
    <header class="header">
      <h1 @click="showTag">本地视频管理系统</h1>
      <div class="search-container">
        <input
          type="text"
          v-model="searchQuery"
          @input="handleSearch"
          placeholder="搜索视频名称或标签..."
          class="search-input"
        />
      </div>
    </header>
    
    <main class="video-grid">
      <div
        v-for="video in videos"
        :key="video.id"
        class="video-card"
        @click="navigateToVideo(video.id)"
      >
        <div class="video-cover">
          <img
            v-if="video.coverUrl"
            :src="video.coverUrl"
            :alt="video.name"
            class="cover-image"
          />
          <div v-else class="default-cover">
            <span>{{ video.name }}</span>
          </div>
        </div>
        <div class="video-info">
          <h3 class="video-title">{{ video.name }}</h3>
          <div class="video-tags" v-if="isTagging">
            <span
              v-for="tag in (video.tags || []).slice(0, 3)"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
            <span v-if="(video.tags || []).length > 3" class="tag-more">
              +{{ (video.tags || []).length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </main>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 分页组件 -->
    <div v-if="!isLoading && pagination.totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        <span>共 {{ pagination.totalCount }} 个视频，第 {{ pagination.currentPage }}/{{ pagination.totalPages }} 页</span>
      </div>
      <div class="pagination-controls">
        <button 
          class="page-btn" 
          :disabled="pagination.currentPage === 1"
          @click="changePage(pagination.currentPage - 1)"
        >
          上一页
        </button>
        
        <!-- 页码按钮 -->
        <button 
          v-for="page in pageNumbers" 
          :key="page"
          class="page-btn"
          :class="{ active: page === pagination.currentPage }"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
        
        <button 
          class="page-btn" 
          :disabled="pagination.currentPage === pagination.totalPages"
          @click="changePage(pagination.currentPage + 1)"
        >
          下一页
        </button>
      </div>
      
      <!-- 页码跳转 -->
      <div class="pagination-jump">
        <span>跳转到</span>
        <input 
          type="number" 
          v-model.number="jumpPage" 
          min="1" 
          :max="pagination.totalPages"
          @keyup.enter="jumpToPage"
          class="jump-input"
        />
        <span>页</span>
        <button class="jump-btn" @click="jumpToPage">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      videos: [],
      searchQuery: '',
      isLoading: false,
      isTagging: true,
      pagination: {
        currentPage: 1,
        pageSize: 41,
        totalCount: 0,
        totalPages: 0
      },
      jumpPage: 1
    };
  },
  computed: {
    pageNumbers() {
      const pages = [];
      const totalPages = this.pagination.totalPages;
      const currentPage = this.pagination.currentPage;
      
      // 显示当前页前后各2页，加上第一页和最后一页
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
      
      // 添加第一页
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // 添加中间页
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 添加最后一页
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
      
      return pages;
    }
  },
  mounted() {
    this.fetchVideos();
  },
  methods: {
    async fetchVideos() {
      this.isLoading = true;
      try {
        let url;
        if (this.searchQuery) {
          url = `http://localhost:3001/api/videos/search?q=${encodeURIComponent(this.searchQuery)}&page=${this.pagination.currentPage}&limit=${this.pagination.pageSize}`;
        } else {
          url = `http://localhost:3001/api/videos?page=${this.pagination.currentPage}&limit=${this.pagination.pageSize}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        // 假设后端返回格式为 { videos: [], pagination: {} }
        if (data.videos) {
          this.videos = data.videos;
          this.pagination = data.pagination;
        } else {
          // 兼容旧格式（如果需要）
          this.videos = data;
          this.pagination = {
            currentPage: 1,
            pageSize: this.pagination.pageSize,
            totalCount: data.length,
            totalPages: Math.ceil(data.length / this.pagination.pageSize)
          };
        }
        
        // 更新跳转页码
        this.jumpPage = this.pagination.currentPage;
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async handleSearch() {
      // 搜索时重置到第一页
      this.pagination.currentPage = 1;
      await this.fetchVideos();
    },
    navigateToVideo(videoId) {
      this.$router.push(`/video/${videoId}`);
    },
    showTag() {
      this.isTagging = !this.isTagging;
    },
    changePage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.pagination.currentPage = page;
        this.fetchVideos();
      }
    },
    jumpToPage() {
      let page = this.jumpPage;
      if (page < 1) {
        page = 1;
      } else if (page > this.pagination.totalPages) {
        page = this.pagination.totalPages;
      }
      this.pagination.currentPage = page;
      this.fetchVideos();
    }
  },
};
</script>

<style scoped>
.home {
  width: 100%;
  margin: 0;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #333;
  margin-bottom: 20px;
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 25px;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #4CAF50;
}

.video-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px 0;
  justify-content: flex-start;
}

.video-card {
  position: relative;
  flex: 0 0 calc(25% - 15px);
  max-width: 260px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .video-card {
    flex: 0 0 calc(33.333% - 14px);
    max-width: calc(33.333% - 14px);
  }
}

@media (max-width: 768px) {
  .video-card {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

@media (max-width: 576px) {
  .video-card {
    flex: 0 0 100%;
    max-width: 100%;
  }
}



.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.video-cover {
  width: 100%;
  height: 380px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-cover {
  width: 100%;
  height: 100%;
  background: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
  font-size: 14px;
}

.video-info {
  padding: 15px;
  position: absolute;
  bottom: 0;
  background-color: rgba(138, 21, 21, 0);
}

.video-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  background: #f0f0f0;
  color: #666;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.tag-more {
  background: #e0e0e0;
  color: #999;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 分页样式 */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #4CAF50;
}

.page-btn.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 页码跳转 */
.pagination-jump {
  display: flex;
  align-items: center;
  gap: 10px;
}

.jump-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.jump-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.jump-btn:hover {
  background: #45a049;
}
</style>


