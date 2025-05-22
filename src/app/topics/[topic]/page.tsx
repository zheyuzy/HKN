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
    <main className="max-w-4xl mx-auto py-8 px-4 bg-[#000000]">
      {/* Header: HKN Title, Byline (Left) and Topic Navigation Buttons (Right) */}
      <div className="flex items-start justify-between mb-8">
        {/* Left Section: HKN Title and Byline */}
        <div className="flex flex-col items-start">
          {/* Inner container for HKN and Byline */}
          <div className="flex flex-col items-start">
            {/* HKN Title as Home Button */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity duration-200">
              <h1 className={`text-4xl font-bold ${rockSalt.className} text-white`}>
                <span className="text-pink-400">H</span>
                <span className="text-rose-400">K</span>
                <span className="text-red-500">N</span>
              </h1>
            </Link>
            {/* User's GitHub Link below HKN title */}
            <a
              href="https://github.com/zheyuzy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-pink-400 text-xs transition-colors duration-200 mt-1"
            >
              by zheyuzy
            </a>
          </div>
        </div>

        {/* Right Section: Topic Navigation Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {Object.keys(TOPIC_KEYWORDS).slice(0, 3).map((topic) => (
              <Link
                key={topic}
                href={`/topics/${encodeURIComponent(topic)}`}
                className={`px-3 py-1 rounded-full text-xs transition-colors duration-200 whitespace-nowrap ${decodedTopic === topic ? 'bg-gray-700 text-rose-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
              >
                {topic === 'Dev/Software' ? 'Dev/Prog' : topic}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            {Object.keys(TOPIC_KEYWORDS).slice(3).map((topic) => (
              <Link
                key={topic}
                href={`/topics/${encodeURIComponent(topic)}`}
                className={`px-3 py-1 rounded-full text-xs transition-colors duration-200 whitespace-nowrap ${decodedTopic === topic ? 'bg-gray-700 text-rose-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Render the Client Component for the story list and load more */}
      <TopicStoryList
        initialStories={initialStories}
        allStoryIds={allStoryIds}
        initialLoadedIdsCount={loadedIdsCount}
        decodedTopic={decodedTopic}
      />
    </main>
  );
} 