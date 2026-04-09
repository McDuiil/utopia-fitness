import { AppData } from "../types";

const GIST_FILENAME = 'utopia_fitness_data.json';

export const githubService = {
  async fetchGist(token: string, gistId: string): Promise<AppData | null> {
    try {
      const response = await window.fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch gist');
      const gist = await response.json();
      const content = gist.files[GIST_FILENAME]?.content;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      console.error('Fetch Gist Error:', error);
      return null;
    }
  },

  async updateGist(token: string, gistId: string, data: AppData): Promise<boolean> {
    try {
      const response = await window.fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2),
            },
          },
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Update Gist Error:', error);
      return false;
    }
  },

  async createGist(token: string, data: AppData): Promise<string | null> {
    try {
      const response = await window.fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Utopia Fitness App Data',
          public: false,
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2),
            },
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to create gist');
      const gist = await response.json();
      return gist.id;
    } catch (error) {
      console.error('Create Gist Error:', error);
      return null;
    }
  },
};
