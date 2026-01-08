<template>
  <div class="home">
    <header class="header">
      <h1>本地视频管理系统</h1>
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
          <div class="video-tags">
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
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      videos: [],
      searchQuery: '',
      isLoading: false
    };
  },
  mounted() {
    this.fetchVideos();
  },
  methods: {
    async fetchVideos() {
      this.isLoading = true;
      try {
        const response = await fetch('http://localhost:3001/api/videos');
        const data = await response.json();
        this.videos = data;
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async handleSearch() {
      try {
        const url = this.searchQuery
          ? `http://localhost:3001/api/videos/search?q=${encodeURIComponent(this.searchQuery)}`
          : 'http://localhost:3001/api/videos';
        const response = await fetch(url);
        const data = await response.json();
        this.videos = data;
      } catch (error) {
        console.error('Failed to search videos:', error);
      }
    },
    navigateToVideo(videoId) {
      this.$router.push(`/video/${videoId}`);
    }
  }
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
  flex: 0 0 calc(25% - 15px);
  max-width: calc(25% - 15px);
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
  height: 150px;
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
}

.video-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
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
</style>