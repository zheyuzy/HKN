import { Story } from '../types';

export const TOP_STORIES_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
export const STORY_URL = 'https://hacker-news.firebaseio.com/v0/item';
export const MIN_STORIES_PER_TOPIC = 6;

export const TOPIC_KEYWORDS: { [key: string]: string[] } = {
  'AI/ML': ['AI', 'ML', 'GPT', 'Model', 'Neural Network', 'Data Science', 'Learning', 'Claude'],
  'Finance/Crypto': ['Finance', 'Financial', 'Invest', 'Stock', 'Market', 'Economy', 'Crypto', 'Cryptocurrency', 'Bitcoin', 'Ethereum', 'Blockchain', 'DeFi', 'NFT', 'Trading', 'Investment', 'Exchange', 'Mining', 'Regulation', 'Web3', 'Venture Capital', 'IPO', 'Stocks', 'Inflation', 'Banking'],
  'Dev/Software': ['Software', 'Development', 'Programming', 'Code', 'Language', 'Framework', 'Library', 'Tool', 'System', 'Frontend', 'Backend', 'Database', 'JavaScript', 'Python', 'Rust', 'Go'],
  'Hardware': ['Hardware', 'Chip', 'Processor', 'System', 'Operating System', 'Kernel', 'Performance', 'Architecture'],
  'Business / Startups': ['Show HN', 'Ask HN', 'Launch HN', 'Startup', 'Business', 'Company', 'Funding', 'Acquisition', 'Market'],
  'Other': [],
};

export function classifyStories(stories: Story[]) {
  const classified: { [key: string]: Story[] } = {};
  const orderedTopics = Object.keys(TOPIC_KEYWORDS);
  orderedTopics.forEach((topic: string) => {
    classified[topic] = [];
  });
  classified['Other'] = [];

  stories.forEach(story => {
    let matched = false;
    const titleLower = story.title.toLowerCase();

    orderedTopics.forEach((topic: string) => {
      const keywords = TOPIC_KEYWORDS[topic].map((k: string) => k.toLowerCase());
      if (keywords.some((keyword: string) => titleLower.includes(keyword))) {
        classified[topic].push(story);
        matched = true;
      }
    });

    if (!matched) {
      classified['Other'].push(story);
    }
  });

  return classified;
} 