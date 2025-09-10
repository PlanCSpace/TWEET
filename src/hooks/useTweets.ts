import { useState, useEffect, useCallback } from 'react';
import tweetsData from '../data/tweets.json';

interface Tweet {
  id: number;
  text: string;
  // author and timestamp are no longer present in tweets.json
  // author?: string;
  // timestamp?: string;
}

// Fisher-Yates (Knuth) Shuffle Algorithm
const shuffleArray = (array: Tweet[]) => {
  const shuffledArray = [...array]; // Create a mutable copy
  let currentIndex = shuffledArray.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
      shuffledArray[randomIndex], shuffledArray[currentIndex]];
  }

  return shuffledArray;
};

// Key for local storage
const LOCAL_STORAGE_KEY = 'copiedTweetIds';

export const useTweets = () => {
  // Initialize allTweets defensively, ensuring tweetsData is an array
  const [allTweets] = useState<Tweet[]>(() => {
    // Check if tweetsData is an array before spreading and shuffling
    const dataToShuffle = Array.isArray(tweetsData) ? tweetsData : [];
    return shuffleArray([...dataToShuffle]);
  });

  // Initialize copiedTweetIds from local storage
  const [copiedTweetIds, setCopiedTweetIds] = useState<number[]>(() => {
    try {
      const storedIds = localStorage.getItem(LOCAL_STORAGE_KEY);
      // Ensure parsed data is an array, default to empty array if null or not array
      const parsedIds = storedIds ? JSON.parse(storedIds) : null;
      return Array.isArray(parsedIds) ? parsedIds : [];
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return [];
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const tweetsPerPage = 50;
  const [loadingCopied, setLoadingCopied] = useState(false); // Set to false as no async fetch

  useEffect(() => {
    setLoadingCopied(false); // Ensure loading is false after initial state setup
  }, []); // Empty dependency array means this runs once on mount

  // Effect to save copiedTweetIds to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(copiedTweetIds));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [copiedTweetIds]); // Depend on copiedTweetIds state

  const copyTweet = async (tweet: Tweet) => {
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(tweet.text);

      // Update local state immediately
      // Add the tweet ID to the copiedTweetIds array if it's not already there
      if (!copiedTweetIds.includes(tweet.id)) {
         setCopiedTweetIds(prevIds => [...prevIds, tweet.id]);
      }

      return true; // Indicate success
    } catch (error) {
      console.error('Failed to copy tweet or update local storage:', error);
      return false; // Indicate failure
    }
  };

  const getTotalPages = () => Math.ceil(allTweets.length / tweetsPerPage);

  const getCurrentPageTweets = () => {
    // Add a defensive check for allTweets being an array before filtering
    if (!Array.isArray(allTweets)) {
        console.error("allTweets is not an array when getCurrentPageTweets is called:", allTweets);
        return []; // Return an empty array to prevent the error
    }

    // Separate tweets into copied (locally) and uncopied
    const uncopiedTweets = allTweets.filter(tweet => !copiedTweetIds.includes(tweet.id));
    const copiedTweets = allTweets.filter(tweet => copiedTweetIds.includes(tweet.id));

    // Combine uncopied first, then copied. Keep original shuffled order within groups.
    const orderedTweets = [...uncopiedTweets, ...copiedTweets];

    // Apply pagination
    const startIndex = (currentPage - 1) * tweetsPerPage;
    const endIndex = startIndex + tweetsPerPage;
    return orderedTweets.slice(startIndex, endIndex);
  };

  const getStats = () => {
    // Add a defensive check for allTweets being an array before filtering
    if (!Array.isArray(allTweets)) {
        console.error("allTweets is not an array when getStats is called:", allTweets);
        return {
            totalTweets: 0,
            todayTweets: 0,
            uniqueAuthors: 0,
            totalCopied: copiedTweetIds.length
        };
    }

    // Since 'timestamp' and 'author' are no longer in tweets.json,
    // 'todayTweets' and 'uniqueAuthors' cannot be calculated.
    // We will return 0 for these values.
    const totalCopied = copiedTweetIds.length;

    return {
      totalTweets: allTweets.length,
      todayTweets: 0, // Cannot calculate without timestamp
      uniqueAuthors: 0, // Cannot calculate without author
      totalCopied
    };
  };

  return {
    tweets: getCurrentPageTweets(), // Return paginated and ordered tweets
    copiedTweetIds, // Return the list of copied IDs (from local storage)
    currentPage,
    setCurrentPage,
    tweetsPerPage,
    copyTweet,
    getTotalPages,
    getStats,
    isTweetCopied: (id: number) => copiedTweetIds.includes(id),
    loadingCopied, // Still expose, but it will be false quickly
  };
};
