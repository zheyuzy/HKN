"use client";

import React, { useEffect, useState } from 'react';
import { Playfair_Display, Source_Serif_4 } from 'next/font/google';
import { Rock_Salt } from 'next/font/google';
// import nlp from 'compromise'; // Keeping import commented out for now
import Link from 'next/link';

import { STORIES_PER_LOAD } from '../lib/constants';
import { TOP_STORIES_URL, STORY_URL, MIN_STORIES_PER_TOPIC, TOPIC_KEYWORDS, classifyStories } from './lib/utils';
import { Story } from './types';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: '400',
});

const sourceSerif = Source_Serif_4({ subsets: ['latin'] })

const rockSalt = Rock_Salt({ subsets: ['latin'], weight: '400' });

export default function HomePage() {
  // State to hold all story IDs fetched initially
  const [allStoryIds, setAllStoryIds] = useState<number[]>([]);
  // State to hold stories currently displayed, grouped by topic
  const [displayedStoriesByTopic, setDisplayedStoriesByTopic] = useState<{ [key: string]: Story[] }>({});
  // State to hold story IDs remaining to be loaded for each topic
  const [remainingStoryIdsByTopic, setRemainingStoryIdsByTopic] = useState<{ [key: string]: number[] }>({});
  // State to track initial loading state
  const [loading, setLoading] = useState(true);
  // State to track loading state specifically for each topic's load more button
  const [loadingMoreByTopic, setLoadingMoreByTopic] = useState<{ [key: string]: boolean }>({});
  // State to track the index up to which story IDs have been processed from allStoryIds
  const [loadedStoriesCount, setLoadedStoriesCount] = useState(STORIES_PER_LOAD);
  // State to track loading state for the global load more button
  const [loadingMoreGlobal, setLoadingMoreGlobal] = useState(false);

  useEffect(() => {
    async function fetchAndPrepareStories() {
      setLoading(true);
      try {
        const res = await fetch(TOP_STORIES_URL);
        if (!res.ok) {
          throw new Error(`Failed to fetch top stories: ${res.status}`);
        }
        const allIds: number[] = await res.json();
        setAllStoryIds(allIds);

        // Fetch details only for the initial batch of stories
        const initialIds = allIds.slice(0, STORIES_PER_LOAD);
        const initialStoryPromises = initialIds.map(id => fetch(`${STORY_URL}/${id}.json`).then(res => res.json()));
        const initialStories: Story[] = await Promise.all(initialStoryPromises);

        // Classify the initial stories
        const classified = classifyStories(initialStories);

        const initialDisplayed: { [key: string]: Story[] } = {};
        const remainingIds: { [key: string]: number[] } = {};
        const initialLoadingMore: { [key: string]: boolean } = {};

        // Determine initial stories to display and remaining IDs for each topic
        Object.entries(classified).forEach(([topic, stories]) => {
          if (stories.length >= MIN_STORIES_PER_TOPIC) {
            // Take the first few stories for initial display
            initialDisplayed[topic] = stories.slice(0, STORIES_PER_LOAD);
            // Store the IDs of the remaining stories for this topic
            remainingIds[topic] = stories.slice(STORIES_PER_LOAD).map(story => story.id);
            initialLoadingMore[topic] = false;
          } else {
             // If a topic doesn't meet the minimum, or has fewer than STORIES_PER_LOAD, display what it has and no remaining
             if(stories.length > 0) {
                 initialDisplayed[topic] = stories; // Display all if less than MIN_STORIES_PER_TOPIC but more than 0
                 remainingIds[topic] = [];
                 initialLoadingMore[topic] = false;
             } else {
                initialDisplayed[topic] = [];
                remainingIds[topic] = [];
                initialLoadingMore[topic] = false;
             }
          }
        });

        setDisplayedStoriesByTopic(initialDisplayed);
        setRemainingStoryIdsByTopic(remainingIds);
        setLoadingMoreByTopic(initialLoadingMore);
        // Update loadedStoriesCount after the initial fetch and classification
        setLoadedStoriesCount(initialIds.length);
      } catch (error) {
        console.error("Error fetching stories:", error);
        // Optionally set an error state here to display to the user
      } finally {
        setLoading(false);
      }
    }
    fetchAndPrepareStories();
  }, []); // Empty dependency array

  const handleLoadMoreTopic = async (topic: string) => {
    setLoadingMoreByTopic(prev => ({ ...prev, [topic]: true }));

    const currentRemainingIds = remainingStoryIdsByTopic[topic];
    if (!currentRemainingIds || currentRemainingIds.length === 0) {
      setLoadingMoreByTopic(prev => ({ ...prev, [topic]: false }));
      return; // No more stories to load for this topic
    }

    // Get the next batch of IDs for this topic
    const nextIdsToLoad = currentRemainingIds.slice(0, STORIES_PER_LOAD);
    const storyPromises = nextIdsToLoad.map(id => fetch(`${STORY_URL}/${id}.json`).then(res => res.json()));
    const newStories: Story[] = await Promise.all(storyPromises);

    // Update the displayed stories and remaining IDs for this topic
    setDisplayedStoriesByTopic(prev => ({ ...prev, [topic]: [...prev[topic], ...newStories] }));
    setRemainingStoryIdsByTopic(prev => ({ ...prev, [topic]: currentRemainingIds.slice(STORIES_PER_LOAD) }));
    setLoadingMoreByTopic(prev => ({ ...prev, [topic]: false }));
  };

  const handleLoadMoreNews = async () => {
    if (loadingMoreGlobal || loadedStoriesCount >= allStoryIds.length) {
      return; // Don't load more if already loading or no more stories left
    }

    setLoadingMoreGlobal(true);

    try {
      // Get the next batch of IDs from the total list
      const nextIdsToLoad = allStoryIds.slice(loadedStoriesCount, loadedStoriesCount + STORIES_PER_LOAD);

      if (nextIdsToLoad.length === 0) {
        setLoadingMoreGlobal(false);
        return; // No more IDs to fetch
      }

      // Fetch details for the next batch of stories
      const storyPromises = nextIdsToLoad.map(id => fetch(`${STORY_URL}/${id}.json`).then(res => res.json()));
      const newStories: Story[] = await Promise.all(storyPromises);

      // Classify the new stories
      const classifiedNewStories = classifyStories(newStories);

      // Update the displayed stories for each topic
      setDisplayedStoriesByTopic(prev => {
        const updatedDisplayed: { [key: string]: Story[] } = { ...prev };
        Object.entries(classifiedNewStories).forEach(([topic, stories]) => {
          updatedDisplayed[topic] = [...(updatedDisplayed[topic] || []), ...stories];
        });
        return updatedDisplayed;
      });

      // Update the loaded count
      setLoadedStoriesCount(prev => prev + nextIdsToLoad.length);

    } catch (error) {
      console.error("Error loading more news:", error);
      // Optionally set an error state
    } finally {
      setLoadingMoreGlobal(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto py-8 px-4 bg-[#000000]">
      {/* Header: HKN (Left), Top News Title (Center), and Topic Buttons (Right) */}
      <div className="flex items-center justify-between mb-8">
        {/* Left Section: HKN Title and Byline */}
        <div className="flex flex-col items-start">
          <h1 className={`text-4xl font-bold ${rockSalt.className}`}>
            <span className="text-pink-400">H</span>
            <span className="text-rose-400">K</span>
            <span className="text-red-500">N</span>
          </h1>
          {/* User's GitHub Link below HKN title */}
          <a
            href="https://github.com/zheyuzy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-800 hover:text-pink-400 text-xs transition-colors duration-200 mt-1"
          >
            by zheyuzy
          </a>
        </div>

        {/* Right Section: Topic Navigation Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {['AI/ML', 'Finance/Crypto', 'Dev/Software'].map((topic) => (
              <Link
                key={topic}
                href={`/topics/${encodeURIComponent(topic)}`}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-xs transition-colors duration-200 whitespace-nowrap"
              >
                {topic === 'Dev/Software' ? 'Dev/Prog' : topic}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            {['Hardware', 'Business / Startups', 'Other'].map((topic) => (
              <Link
                key={topic}
                href={`/topics/${encodeURIComponent(topic)}`}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-xs transition-colors duration-200 whitespace-nowrap"
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {loading ? (
        <div className="text-lg text-white">Loading...</div>
      ) : (
        <div>
          {Object.entries(displayedStoriesByTopic)
             .sort(([topicA], [topicB]) => {
               const order = ['AI/ML', 'Finance/Crypto', 'Dev/Software', 'Hardware', 'Business / Startups', 'Other'];
               return order.indexOf(topicA) - order.indexOf(topicB);
             })
             .map(([topic, stories]) => stories.length >= MIN_STORIES_PER_TOPIC && (
            <div 
              key={topic} 
              id={topic.toLowerCase().replace(/\s+/g, '-')}
              className="mb-12 bg-gray-950/50 rounded-xl p-6 shadow-lg border border-gray-800 scroll-mt-24 flex gap-2"
            >
              {/* Left side: Topic Title */}
              <div className="flex-shrink-0 w-24">
                <Link href={`/topics/${encodeURIComponent(topic)}`} className="block">
                  <h2 className={`text-xl font-bold border-b border-gray-700 pb-3 hover:underline whitespace-normal ${playfair.className} ${stories.length >= MIN_STORIES_PER_TOPIC ? 'text-pink-200' : 'text-white'}`}>
                    {topic === 'Dev/Software' ? 'Dev/Prog' : topic}
                  </h2>
                </Link>
              </div>

              {/* Right side: News Grid and Load More */}
              <div className="flex-1">
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
                {remainingStoryIdsByTopic[topic] && remainingStoryIdsByTopic[topic].length > 0 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => handleLoadMoreTopic(topic)}
                      disabled={loadingMoreByTopic[topic]}
                      className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 transition-colors duration-200"
                    >
                      {`Load More ${topic}`}
                    </button>
                  </div>
                )}

                {/* User's GitHub Link below Other topic */}
                {topic === 'Other' && (
                  <div className="flex justify-center mt-6">
                    <a
                      href="https://github.com/zheyuzy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 hover:text-pink-400 text-xs transition-colors duration-200"
                    >
                      by zheyuzy
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
} 