// API Client - Replaces localStorage with backend calls
// All data operations go through this module

const API_BASE = 'http://localhost:5000/api';

// Current user ID (mock - in production this would come from authentication)
let currentUserId = localStorage.getItem('userId') || 'user-default';

export const api = {
  // ==================== MANUALS ====================
  
  async getManuals() {
    try {
      const response = await fetch(`${API_BASE}/manuals`);
      if (!response.ok) throw new Error(`Failed to fetch manuals: ${response.status}`);
      const data = await response.json();
      // Normalize response: API returns {value: [...], Count: ...}
      // Return in consistent format with 'value' property
      return {
        value: data.value || data.data || data.manuals || (Array.isArray(data) ? data : []),
        data: data.value || data.data || data.manuals || (Array.isArray(data) ? data : [])
      };
    } catch (err) {
      console.error('Error fetching manuals:', err);
      return { value: [], data: [] };
    }
  },

  async getManual(id) {
    try {
      const response = await fetch(`${API_BASE}/manuals/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch manual: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching manual:', err);
      return null;
    }
  },

  async createManual(manual) {
    try {
      const response = await fetch(`${API_BASE}/manuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manual)
      });
      if (!response.ok) throw new Error(`Failed to create manual: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error creating manual:', err);
      return null;
    }
  },

  async updateManual(id, manual) {
    try {
      // Normalize: convert 'steps' field to 'content' for backend
      const dataToSend = {...manual};
      if (dataToSend.steps && !dataToSend.content) {
        dataToSend.content = dataToSend.steps;
        delete dataToSend.steps;
      }
      const response = await fetch(`${API_BASE}/manuals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      if (!response.ok) throw new Error(`Failed to update manual: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error updating manual:', err);
      return null;
    }
  },

  async deleteManual(id) {
    try {
      const response = await fetch(`${API_BASE}/manuals/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete manual: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error deleting manual:', err);
      return null;
    }
  },

  // ==================== DIAGRAMS (FIBRA) ====================

  async getDiagrams() {
    try {
      const response = await fetch(`${API_BASE}/diagrams`);
      if (!response.ok) throw new Error(`Failed to fetch diagrams: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching diagrams:', err);
      return [];
    }
  },

  async createDiagram(diagram) {
    try {
      const response = await fetch(`${API_BASE}/diagrams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagram)
      });
      if (!response.ok) throw new Error(`Failed to create diagram: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error creating diagram:', err);
      return null;
    }
  },

  async updateDiagram(id, diagram) {
    try {
      const response = await fetch(`${API_BASE}/diagrams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagram)
      });
      if (!response.ok) throw new Error(`Failed to update diagram: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error updating diagram:', err);
      return null;
    }
  },

  async deleteDiagram(id) {
    try {
      const response = await fetch(`${API_BASE}/diagrams/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete diagram: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error deleting diagram:', err);
      return null;
    }
  },

  // ==================== PROGRESS ====================

  async getProgress(userId = currentUserId) {
    try {
      const response = await fetch(`${API_BASE}/progress/${userId}`);
      if (!response.ok) throw new Error(`Failed to fetch progress: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching progress:', err);
      return [];
    }
  },

  async updateProgress(manualId, stepIndex, completed) {
    try {
      const response = await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          manualId,
          stepIndex,
          completed
        })
      });
      if (!response.ok) throw new Error(`Failed to update progress: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error updating progress:', err);
      return null;
    }
  },

  // ==================== COMMENTS ====================

  async getComments(manualId) {
    try {
      const response = await fetch(`${API_BASE}/comments/${manualId}`);
      if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching comments:', err);
      return [];
    }
  },

  async addComment(manualId, text) {
    try {
      const response = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          manualId,
          text
        })
      });
      if (!response.ok) throw new Error(`Failed to add comment: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error adding comment:', err);
      return null;
    }
  },

  async deleteComment(commentId) {
    try {
      const response = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete comment: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error deleting comment:', err);
      return null;
    }
  },

  // ==================== HISTORY ====================

  async getHistory(userId = currentUserId) {
    try {
      const response = await fetch(`${API_BASE}/history/${userId}`);
      if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching history:', err);
      return [];
    }
  },

  async addHistoryEntry(manualId = null, diagramId = null, action = 'view') {
    try {
      const response = await fetch(`${API_BASE}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          manualId,
          diagramId,
          action
        })
      });
      if (!response.ok) throw new Error(`Failed to add history entry: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error adding history entry:', err);
      return null;
    }
  },

  // ==================== USERS ====================

  async getUsers() {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  },

  async createUser(username, password, role = 'agent', name = '') {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, name })
      });
      if (!response.ok) throw new Error(`Failed to create user: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error creating user:', err);
      return null;
    }
  },

  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error(`Failed to login: ${response.status}`);
      const data = await response.json();
      if (data.user) {
        currentUserId = data.user.id;
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('authToken', data.token);
      }
      return data;
    } catch (err) {
      console.error('Error logging in:', err);
      return null;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Failed to delete user: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error deleting user:', err);
      return null;
    }
  },

  // ==================== HEALTH ====================

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error health check:', err);
      return null;
    }
  },

  // ==================== UTILITY ====================

  setCurrentUserId(userId) {
    currentUserId = userId;
    localStorage.setItem('userId', userId);
  },

  getCurrentUserId() {
    return currentUserId;
  }
};

export default api;
