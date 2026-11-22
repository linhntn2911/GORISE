import { answerQuestion } from '../assistant.js';
import { json, readJson, tooMany } from '../utils/http.js';

export async function handleAssistant(req, res, pathname) {
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    if (tooMany(req)) {
      json(res, 429, { error: 'Bạn chờ một chút rồi hỏi tiếp nhé!' });
      return true;
    }
    try {
      const data = await readJson(req);
      const question = typeof data.message === 'string' ? data.message.trim() : '';
      if (!question || question.length > 500) {
        json(res, 400, { error: 'Câu hỏi cần từ 1 đến 500 ký tự.' });
        return true;
      }
      const history = (Array.isArray(data.history) ? data.history : [])
        .slice(-8)
        .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 700),
          topic: typeof item.topic === 'string' ? item.topic.slice(0, 32) : null,
        }));
      const page =
        data.page && typeof data.page === 'object'
          ? {
              path: typeof data.page.path === 'string' ? data.page.path.slice(0, 120) : '',
              title: typeof data.page.title === 'string' ? data.page.title.slice(0, 160) : '',
            }
          : {};
      json(res, 200, await answerQuestion(question, history, page));
    } catch (error) {
      if (error.status) {
        json(res, error.status, { error: error.message });
      } else {
        console.error('Chat request failed:', error.message);
        json(res, 503, { error: 'Oops! Mình gặp một chút trục trặc. Bạn thử hỏi lại mình nhé! 😅' });
      }
    }
    return true;
  }

  return false;
}
