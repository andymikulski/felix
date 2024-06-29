import LuaVM from '../utils/lua/LuaVM';
import { IService } from './ServiceContainer';

export interface ILLMProviderService {
  send(text: string): Promise<string[]>;
}

export class LLMProviderService implements IService, ILLMProviderService {
  private vm = new LuaVM();

  private static OPENAI_API_KEY =
    'key goes here';

  send = async (text: string): Promise<string[]> => {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestData = {
      // model: 'gpt-4-1106-preview',
      model: 'gpt-3.5-turbo-1106',
      response_format: { type: 'json_object' },
      seed: 1234567890, // Date.now(),
      temperature: 1.5,
      messages: [
        {
          role: 'system',
          content: `You are an internet terminal. You `,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    };
    console.log('sending...');
    const start = Date.now();
    return new Promise((res) => {
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLMProviderService.OPENAI_API_KEY}`,
          // 'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify(requestData),
      })
        .then((response) => response.json())
        .then((data) => {
          const end = Date.now();
          const elapsed = end - start;
          console.log(
            `got data from openai in ${elapsed}ms (${elapsed / 1000}sec)`
          );
          console.log('api response', data.choices[0]);

          if (data.error) {
            throw Error(data.error.message || 'Unknown Error');
          }

          const generatedText = JSON.parse(
            data.choices[0].message.content
          ).story;
          res(generatedText);
        })
        .catch((error) => {
          console.error('Error:', error);
        });
    });
  };

  initializeService = async () => {};

  onServicesReady = async () => {};
}

export type LLMMessage = {
  role: 'assistant' | 'user';
  content: string;
};

export class LLMAssistantConvo {
  private model: string = 'gpt-4-1106-preview';
  private threadId?: string;
  private apiKey = 'key goes here';

  constructor(private assistantId: string) {}

  // Start a new conversation thread
  async createThread(initialMessages: LLMMessage[]): Promise<string> {
    const response = await fetch(`https://api.openai.com/v1/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'OpenAI-Beta': 'assistants=v1',
      },
      body: JSON.stringify({ messages: initialMessages }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    this.threadId = data.id;
    return data.id;
  }

  runThread = async (threadId?: string) => {
    if (!threadId) {
      console.error('Thread ID is undefined or invalid');
      throw new Error('Thread ID is undefined or invalid');
    }

    const runUrl = `https://api.openai.com/v1/threads/${threadId}/runs`;

    const runRequestBody = JSON.stringify({
      assistant_id: this.assistantId,
      model: this.model,
    });

    const runResponse = await fetch(runUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1',
      },
      body: runRequestBody,
    });

    if (!runResponse.ok) {
      console.error('Failed to run thread:', runResponse.statusText);
      throw new Error(`Failed to run thread: ${runResponse.statusText}`);
    }

    const runData = await runResponse.json();

    const runId = runData.id;

    let runStatus = runData.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

      const statusUrl = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

      const statusResponse = await fetch(statusUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1',
        },
      });

      if (!statusResponse.ok) {
        console.error('Failed to get run status:', statusResponse.statusText);
        throw new Error(
          `Failed to get run status: ${statusResponse.statusText}`
        );
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
    }

    if (runStatus === 'completed') {
      console.log('Run completed, fetching messages...');

      const messagesUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

      const messagesResponse = await fetch(messagesUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1',
        },
      });

      if (!messagesResponse.ok) {
        console.error('Failed to fetch messages:', messagesResponse.statusText);
        throw new Error(
          `Failed to fetch messages: ${messagesResponse.statusText}`
        );
      }

      const messagesData = await messagesResponse.json();

      // Extracting text from assistant messages
      const assistantMessages = messagesData.data
        .filter((msg: { role: string }) => msg.role === 'assistant')
        .map((msg: { content: { text: { value: any } }[] }) =>
          msg.content
            .map((content: { text: { value: any } }) => content.text?.value)
            .join(' ')
        );
      // .join('\n');

      return assistantMessages[0]; // top most is most recent message
    } else {
      return null;
    }
  };

  createThreadMessage = async (
    threadId: string,
    message: LLMMessage
  ): Promise<void> => {
    const response = await fetch(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'assistants=v1',
        },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
  };

  // Send a message to the current thread
  sendMessage = async <T>(messageText: string): Promise<T> => {
    if (!this.threadId) {
      await this.createThread([{ role: 'user', content: messageText }]);
    } else {
      await this.createThreadMessage(this.threadId, {
        role: 'user',
        content: messageText,
      });
    }
    const res = await this.runThread(this.threadId!);
    return res;
  };
}
