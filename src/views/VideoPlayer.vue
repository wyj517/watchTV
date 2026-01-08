<template>
  <div class="video-player">
    <header class="player-header">
      <button class="back-btn" @click="goBack">返回首页</button>
      <h2>{{ video.name }}</h2>
    </header>
    
    <main class="player-content">
      <div class="video-container">
        <video
          v-if="video.videoUrl"
          :src="video.videoUrl"
          controls
          class="video-element"
        ></video>
        <div v-else class="video-placeholder">
          <p>视频文件不存在</p>
        </div>
      </div>
      
      <div class="video-info">
        <div class="tags-section">
          <h3>标签管理</h3>
          <div class="current-tags">
            <span
              v-for="tag in video.tags"
              :key="tag"
              class="tag-item"
            >
              {{ tag }}
              <button
                class="remove-tag-btn"
                @click.stop="removeTag(tag)"
              >
                ×
              </button>
            </span>
          </div>
          
          <div class="add-tag-section">
            <input
              type="text"
              v-model="newTag"
              @keyup.enter="addTag"
              placeholder="输入新标签，按回车添加"
              class="tag-input"
            />
            <button
              class="add-tag-btn"
              @click="addTag"
            >
              添加标签
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'VideoPlayer',
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      video: {
        id: '',
        name: '',
        videoUrl: '',
        coverUrl: '',
        tags: []
      },
      newTag: ''
    };
  },
  mounted() {
    this.fetchVideoInfo();
  },
  methods: {
    async fetchVideoInfo() {
      try {
        const response = await fetch(`http://localhost:3001/api/videos/${this.id}`);
        if (response.ok) {
          const data = await response.json();
          this.video = data;
        } else {
          console.error('Failed to fetch video info');
        }
      } catch (error) {
        console.error('Error fetching video info:', error);
      }
    },
    async addTag() {
      if (!this.newTag.trim()) return;
      
      const tag = this.newTag.trim();
      if (this.video.tags.includes(tag)) {
        this.newTag = '';
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:3001/api/videos/${this.id}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tag })
        });
        
        if (response.ok) {
          const updatedVideo = await response.json();
          this.video = updatedVideo;
          this.newTag = '';
        }
      } catch (error) {
        console.error('Error adding tag:', error);
      }
    },
    async removeTag(tag) {
      try {
        const response = await fetch(`http://localhost:3001/api/videos/${this.id}/tags/${tag}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const updatedVideo = await response.json();
          this.video = updatedVideo;
        }
      } catch (error) {
        console.error('Error removing tag:', error);
      }
    },
    goBack() {
      this.$router.back();
    }
  }
};
</script>

<style scoped>
.video-player {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.player-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.back-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.back-btn:hover {
  background: #45a049;
}

.player-header h2 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.player-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.video-container {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
}

.video-element {
  width: 100%;
  height: auto;
  max-height: 70vh;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: #333;
  color: white;
}

.video-info {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tags-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.current-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.tag-item {
  background: #4CAF50;
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-tag-btn {
  background: transparent;
  color: white;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.3s;
}

.remove-tag-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.add-tag-section {
  display: flex;
  gap: 10px;
}

.tag-input {
  flex: 1;
  padding: 10px 15px;
  font-size: 14px;
  border: 2px solid #ddd;
  border-radius: 25px;
  outline: none;
  transition: border-color 0.3s;
}

.tag-input:focus {
  border-color: #4CAF50;
}

.add-tag-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.add-tag-btn:hover {
  background: #45a049;
}
</style>