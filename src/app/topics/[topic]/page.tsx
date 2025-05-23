// Removed "use client";

import React from 'react';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';
import { Rock_Salt } from 'next/font/google';
import { TOPIC_KEYWORDS, STORY_URL, TOP_STORIES_URL, STORIES_PER_LOAD } from '../../lib/constants';
import TopicStoryList from '../../components/TopicStoryList';

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

const rockSalt = Rock_Salt({ subsets: ['latin'], weight: '400' });

const MIN_STORIES_TO_AUTOLOAD = 12;
const INITIAL_BATCH_SIZE_SERVER = STORIES_PER_LOAD * 6; // Increased to fetch more stories initially

export default async function TopicPage({ params }: { params: { topic: string } }) {
  const decodedTopic = decodeURIComponent(params.topic);

  let allStoryIds: number[] = [];
  let initialStories: Story[] = [];
  let loadedIdsCount = 0;

  try {
    // Fetch all story IDs on the server
    const res = await fetch(TOP_STORIES_URL);
    if (!res.ok) throw new Error('Failed to fetch all story IDs');
    allStoryIds = await res.json();

    // Fetch and filter stories in batches until MIN_STORIES_TO_AUTOLOAD is met or all available IDs are processed
    let currentBatchStart = 0;
    const storiesForTopic: Story[] = [];

    // Keep fetching until we have enough stories or process all available IDs
    while (
      storiesForTopic.length < MIN_STORIES_TO_AUTOLOAD &&
      currentBatchStart < allStoryIds.length
    ) {
      // Fetch the next batch of IDs
      const nextBatchIds = allStoryIds.slice(currentBatchStart, currentBatchStart + STORIES_PER_LOAD);

      if (nextBatchIds.length === 0) {
        // Should not happen if currentBatchStart < allStoryIds.length, but good safeguard
        break;
      }

      // Fetch details for the current batch of stories in parallel
      const storyPromises = nextBatchIds.map(id =>
        fetch(`${STORY_URL}/${id}.json`).then(res => res.json())
      );
      const newStoriesBatch: Story[] = await Promise.all(storyPromises);

      // Filter stories for the current topic
      const topicStoriesBatch = newStoriesBatch.filter(story => {
        const titleLower = story.title.toLowerCase();
        
        if (decodedTopic === 'Other') {
          // For the 'Other' topic, include stories that do NOT match any other topic keywords
          const otherTopics = Object.keys(TOPIC_KEYWORDS).filter(topic => topic !== 'Other');
          const isNotOtherTopic = otherTopics.every(topic => {
            const keywords = TOPIC_KEYWORDS[topic]?.map((k: string) => k.toLowerCase()) || [];
            return !keywords.some((keyword: string) => titleLower.includes(keyword));
          });
          return isNotOtherTopic;
        } else {
          // For specific topics, filter by their keywords
          const keywords = TOPIC_KEYWORDS[decodedTopic]?.map((k: string) => k.toLowerCase()) || [];
          return keywords.some((keyword: string) => titleLower.includes(keyword));
        }
      });

      storiesForTopic.push(...topicStoriesBatch);

      // Move the starting point for the next batch by the number of IDs processed in this batch
      currentBatchStart += nextBatchIds.length;
      loadedIdsCount = currentBatchStart; // Update loadedIdsCount based on total IDs processed
    }

    initialStories = storiesForTopic;

  } catch (error) {
    console.error('Error fetching initial stories on server:', error);
    // In case of error, initialStories will be empty, and loading will be handled client-side
  }

  return (
    <main className="max-w-3xl mx-auto py-6 px-4 bg-[#000000]">
      {/* Simplified Header */}
      <div className="flex items-center justify-between mb-8">
        {/* Left: HKN Title */}
        <Link href="/" className="hover:opacity-80 transition-opacity duration-200">
          <h1 className={`text-2xl ${rockSalt.className} text-white`}>
            <span className="text-pink-400">H</span>
            <span className="text-rose-400">K</span>
            <span className="text-red-500">N</span>
          </h1>
        </Link>

        {/* Right: Topic Navigation */}
        <div className="flex flex-wrap gap-2 justify-end">
          {Object.keys(TOPIC_KEYWORDS).map((topic) => (
            <Link
              key={topic}
              href={`/topics/${encodeURIComponent(topic)}`}
              className={`px-2 py-1 text-xs transition-colors duration-200 ${
                decodedTopic === topic 
                  ? 'text-rose-400 border-b border-rose-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {topic === 'Dev/Software' ? 'Dev' : topic}
            </Link>
          ))}
        </div>
      </div>

      {/* Story List */}
      <TopicStoryList
        initialStories={initialStories}
        allStoryIds={allStoryIds}
        initialLoadedIdsCount={loadedIdsCount}
        decodedTopic={decodedTopic}
      />
    </main>
  );
} 