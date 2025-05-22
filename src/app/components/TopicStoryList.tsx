"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';
import { STORY_URL, TOPIC_KEYWORDS, STORIES_PER_LOAD } from '../lib/constants';

interface Story {
  id: number;
  title: string;
  by: string;
  time: number;
  score: number;
  url?: string;
  descendants: number;
}

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: '400',
});

interface TopicStoryListProps {
  initialStories: Story[];
  allStoryIds: number[]; // We pass all IDs for now to simplify fetching the next batch
  initialLoadedIdsCount: number; // How many total IDs from allStoryIds were processed initially
  decodedTopic: string;
}

export default function TopicStoryList({ initialStories, allStoryIds, initialLoadedIdsCount, decodedTopic }: TopicStoryListProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialLoadedIdsCount < allStoryIds.length);
  const [loadedIdsCount, setLoadedIdsCount] = useState(initialLoadedIdsCount); // Continue from where server left off

  const loadMore = async () => {
    if (loadingMore || !hasMore || loadedIdsCount >= allStoryIds.length) return;

    setLoadingMore(true);

    try {
      // Fetch next batch of IDs from the overall list
      const nextBatchIds = allStoryIds.slice(loadedIdsCount, loadedIdsCount + STORIES_PER_LOAD);

      if (nextBatchIds.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return; // No more IDs to fetch
      }

      // Fetch details for the next batch of stories
      const storyPromises = nextBatchIds.map(id =>
        fetch(`${STORY_URL}/${id}.json`).then(res => res.json())
      );
      const newStoriesBatch: Story[] = await Promise.all(storyPromises);

      // Filter stories for the current topic
      const topicStoriesBatch = newStoriesBatch.filter(story => {
           const titleLower = story.title.toLowerCase();
           const keywords = TOPIC_KEYWORDS[decodedTopic]?.map((k: string) => k.toLowerCase());
           return keywords?.some((keyword: string) => titleLower.includes(keyword));
      });

      setStories(prevStories => [...prevStories, ...topicStoriesBatch]);
      setLoadedIdsCount(prevCount => prevCount + nextBatchIds.length);

      // Check if there could be more stories to load in subsequent batches
      if (loadedIdsCount + nextBatchIds.length >= allStoryIds.length) {
           setHasMore(false);
      }

    } catch (error) {
      console.error('Error loading more stories:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <ol className="grid grid-cols-2 gap-4">
        {stories.map(story => {
          const isNew = (Date.now() / 1000 - story.time) < 7200; // 2 hours in seconds
          return (
            <li
              key={story.id}
              className={`bg-gray-900/80 rounded-lg p-4 relative group hover:bg-gray-900 transition-colors duration-200`}
            >
              <a
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-30"
              >
                <span className="sr-only">Read more about {story.title}</span>
              </a>
              <div className="relative z-20">
                <div className="flex items-start gap-2">
                  <h3 className={`text-lg block mb-1 text-white line-clamp-3 group-hover:underline flex-1 ${playfair.className}`}>
                    {story.title}
                  </h3>
                  {isNew && (
                    <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-medium rounded-full whitespace-nowrap">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {story.by} | {new Date(story.time * 1000).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-gray-500 hover:text-white text-sm transition-colors duration-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading more stories...' : 'Load more stories'}
          </button>
        </div>
      )}
    </>
  );
} 