import { useState, useEffect } from 'react';
import { Story } from '@/types/hn';

interface TopicStoryListProps {
  initialStories: Story[];
  allStoryIds: number[];
  initialLoadedIdsCount: number;
  decodedTopic: string;
}

export default function TopicStoryList({
  initialStories,
  allStoryIds,
  initialLoadedIdsCount,
  decodedTopic,
}: TopicStoryListProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [loadedIdsCount, setLoadedIdsCount] = useState(initialLoadedIdsCount);
  const [isLoading, setIsLoading] = useState(false);

  const hasMore = loadedIdsCount < allStoryIds.length;

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextBatchSize = 10;
      const nextIds = allStoryIds.slice(loadedIdsCount, loadedIdsCount + nextBatchSize);
      
      const newStories = await Promise.all(
        nextIds.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json()))
      );

      setStories(prev => [...prev, ...newStories]);
      setLoadedIdsCount(prev => prev + nextBatchSize);
    } catch (error) {
      console.error('Error loading more stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {stories.map((story) => (
        <div
          key={story.id}
          className="group relative bg-gray-900/50 hover:bg-gray-900/70 transition-colors duration-200 rounded-lg p-4"
        >
          <div className="flex flex-col gap-2">
            {/* Title and URL */}
            <div className="flex items-start gap-2">
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-200 hover:text-rose-400 transition-colors duration-200 flex-1"
              >
                <h2 className="text-lg font-medium line-clamp-2">{story.title}</h2>
              </a>
              <span className="text-xs text-gray-500 mt-1">
                {new Date(story.time * 1000).toLocaleDateString()}
              </span>
            </div>

            {/* Score and Comments */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                {story.score}
              </span>
              <a
                href={`https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-rose-400 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {story.descendants}
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-rose-400 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
} 