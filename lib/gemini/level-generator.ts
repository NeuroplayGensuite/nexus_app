/**
 * Generative Level Engine
 * Uses Gemini to dynamically generate game content based on child's interests
 */

import { ChildProfile } from '@/types';

export interface GeneratedMazeLevel {
  theme: string;
  story: string;
  character: string;
  goal: string;
  obstacles: string[];
  encouragement: string[];
  victoryMessage: string;
}

export interface GeneratedPhonicLevel {
  theme: string;
  targetWords: Array<{
    word: string;
    phoneme: string;
    imageDescription: string;
    distractors: string[];
  }>;
  instructions: string;
  encouragement: string[];
}

export interface GeneratedMathLevel {
  theme: string;
  story: string;
  problems: Array<{
    question: string;
    answer: number;
    context: string;
    wrongAnswers: number[];
  }>;
  character: string;
  encouragement: string[];
}

export interface GeneratedRhythmLevel {
  theme: string;
  letters: string[];
  story: string;
  beatPattern: string;
  encouragement: string[];
}

export interface GeneratedMemoryLevel {
  theme: string;
  constellation: {
    name: string;
    story: string;
    points: number;
  };
  hints: string[];
  encouragement: string[];
}

// Map interests to theme keywords for prompting
const INTEREST_THEMES: Record<string, string[]> = {
  pokemon: ['Pikachu', 'Pokémon trainer', 'Poké Ball', 'catching Pokémon', 'Ash Ketchum', 'gym battle'],
  cricket: ['cricket match', 'batting', 'bowling', 'Virat Kohli', 'IPL', 'stadium', 'six runs'],
  isro: ['rocket launch', 'Chandrayaan', 'astronaut', 'space mission', 'satellites', 'Moon landing'],
  dinosaurs: ['T-Rex', 'Velociraptor', 'Jurassic', 'fossils', 'prehistoric', 'dinosaur eggs'],
  cars: ['race car', 'Formula 1', 'pit stop', 'racing track', 'sports car', 'finish line'],
  cartoons: ['adventure', 'superhero', 'magical powers', 'cartoon world', 'animated friends'],
  animals: ['jungle safari', 'wild animals', 'zoo adventure', 'animal friends', 'nature'],
  music: ['musical notes', 'concert', 'instruments', 'singing', 'dancing', 'rhythm'],
};

function getThemeKeywords(interests: string[]): string[] {
  const keywords: string[] = [];
  interests.forEach(interest => {
    const themes = INTEREST_THEMES[interest.toLowerCase()];
    if (themes) {
      keywords.push(...themes);
    }
  });
  return keywords.length > 0 ? keywords : ['adventure', 'magical journey', 'fun quest'];
}

export function generateMazeLevelPrompt(profile: ChildProfile): string {
  const themes = getThemeKeywords(profile.interests);
  const lang = profile.preferredLanguage === 'ml' ? 'Malayalam' : 'English';
  
  return `You are a game designer creating content for a child named ${profile.name}, age ${profile.age}.
Their interests are: ${profile.interests.join(', ')}.

Generate a maze game level in ${lang} language with these themes: ${themes.slice(0, 3).join(', ')}.

Return ONLY valid JSON (no markdown) in this format:
{
  "theme": "Theme name",
  "story": "A short 1-2 sentence story setup for the maze (child-friendly)",
  "character": "The character the child controls",
  "goal": "What the character is trying to reach",
  "obstacles": ["obstacle1", "obstacle2", "obstacle3"],
  "encouragement": ["Great job!", "Keep going!", "You're doing amazing!"],
  "victoryMessage": "Celebration message when they complete the maze"
}

Make it exciting, age-appropriate for ${profile.age} years old, and incorporate their interests naturally.`;
}

export function generatePhonicLevelPrompt(profile: ChildProfile): string {
  const themes = getThemeKeywords(profile.interests);
  const lang = profile.preferredLanguage === 'ml' ? 'Malayalam' : 'English';
  
  return `You are creating a phonics game for ${profile.name}, age ${profile.age}.
Their interests: ${profile.interests.join(', ')}.
Language: ${lang}

Generate phonics content themed around: ${themes.slice(0, 2).join(', ')}.

Return ONLY valid JSON:
{
  "theme": "Theme name",
  "targetWords": [
    {
      "word": "ball",
      "phoneme": "b",
      "imageDescription": "A cricket ball flying through the air",
      "distractors": ["car", "tree", "house"]
    },
    {
      "word": "catch",
      "phoneme": "c",
      "imageDescription": "A player catching the ball",
      "distractors": ["run", "jump", "sit"]
    }
  ],
  "instructions": "Listen to the sound and find the picture!",
  "encouragement": ["Super ears!", "You heard it right!", "Excellent listening!"]
}

Create 5 target words. Use simple words appropriate for age ${profile.age}. 
Incorporate ${profile.interests.join(' and ')} themes in image descriptions.`;
}

export function generateMathLevelPrompt(profile: ChildProfile, difficulty: 'easy' | 'medium' | 'hard'): string {
  const themes = getThemeKeywords(profile.interests);
  const lang = profile.preferredLanguage === 'ml' ? 'Malayalam' : 'English';
  
  const difficultyGuide = {
    easy: 'single digit addition/subtraction (1-10)',
    medium: 'double digit operations, simple multiplication (1-50)',
    hard: 'multiplication, division, larger numbers (1-100)'
  };
  
  return `You are creating a math game for ${profile.name}, age ${profile.age}.
Their interests: ${profile.interests.join(', ')}.
Language: ${lang}
Difficulty: ${difficulty} - ${difficultyGuide[difficulty]}

Theme: ${themes.slice(0, 2).join(', ')}

Return ONLY valid JSON:
{
  "theme": "Cricket Math Challenge",
  "story": "Help score runs in the big match!",
  "problems": [
    {
      "question": "Virat scored 6 runs, then 4 more. Total runs?",
      "answer": 10,
      "context": "Hit it to the boundary!",
      "wrongAnswers": [8, 12, 9]
    }
  ],
  "character": "Cricket Star",
  "encouragement": ["Great calculation!", "Math champion!", "Perfect score!"]
}

Create 8 math problems. Make word problems themed around ${profile.interests[0] || 'fun adventures'}.
Ensure wrong answers are plausible but clearly wrong.`;
}

export function generateRhythmLevelPrompt(profile: ChildProfile): string {
  const themes = getThemeKeywords(profile.interests);
  const lang = profile.preferredLanguage === 'ml' ? 'Malayalam' : 'English';
  
  return `You are creating a rhythm/coordination game for ${profile.name}, age ${profile.age}.
Their interests: ${profile.interests.join(', ')}.
Language: ${lang}

Theme: ${themes.slice(0, 2).join(', ')}

Return ONLY valid JSON:
{
  "theme": "Theme name",
  "letters": ["P", "O", "K", "E", "M", "O", "N"],
  "story": "Catch the falling letters to spell the magic word!",
  "beatPattern": "1-2-1-2-1-2-1",
  "encouragement": ["Perfect timing!", "Great rhythm!", "Keep the beat!"]
}

Choose letters that spell a word related to their interests.
Make it exciting for age ${profile.age}.`;
}

export function generateMemoryLevelPrompt(profile: ChildProfile): string {
  const themes = getThemeKeywords(profile.interests);
  const lang = profile.preferredLanguage === 'ml' ? 'Malayalam' : 'English';
  
  return `You are creating a visual memory game for ${profile.name}, age ${profile.age}.
Their interests: ${profile.interests.join(', ')}.
Language: ${lang}

Theme: ${themes.slice(0, 2).join(', ')}

Return ONLY valid JSON:
{
  "theme": "Theme name",
  "constellation": {
    "name": "The Cricket Bat",
    "story": "Long ago, a magical cricket bat was placed in the stars...",
    "points": 5
  },
  "hints": ["Look for the handle at the top", "The blade is wide"],
  "encouragement": ["Sharp memory!", "You remembered it!", "Star mapper!"]
}

Create a constellation themed around ${profile.interests[0] || 'adventure'}.
Make the story engaging for age ${profile.age}.`;
}

// API call function
export async function generateLevel<T>(prompt: string): Promise<T | null> {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt,
        type: 'level-generation'
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to generate level');
      return null;
    }
    
    const data = await response.json();
    
    // Check if we got valid content
    if (!data.content || data.error) {
      console.log('No content from API, using fallback');
      return null;
    }
    
    // Parse the JSON from Gemini's response
    try {
      // Clean up response - remove markdown code blocks if present
      let content = data.content || '';
      
      // Handle empty content
      if (!content || content.trim() === '') {
        console.log('Empty content from API');
        return null;
      }
      
      // Remove markdown code blocks
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Try to find JSON object in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      
      // Try direct parse as last resort
      return JSON.parse(content) as T;
    } catch (parseError) {
      console.error('Failed to parse generated level:', parseError);
      console.log('Raw content:', data.content?.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error('Level generation error:', error);
    return null;
  }
}

// Fallback content when API fails
export const FALLBACK_CONTENT = {
  maze: {
    theme: 'Adventure Quest',
    story: 'Guide your hero through the magical maze!',
    character: 'Brave Explorer',
    goal: 'Golden Treasure',
    obstacles: ['Moving walls', 'Tricky turns', 'Hidden paths'],
    encouragement: ['Great job!', 'Keep going!', 'Almost there!'],
    victoryMessage: 'You found the treasure! 🎉'
  } as GeneratedMazeLevel,
  
  phonic: {
    theme: 'Sound Safari',
    targetWords: [
      { word: 'ball', phoneme: 'b', imageDescription: 'A bouncy ball', distractors: ['car', 'tree', 'house'] },
      { word: 'cat', phoneme: 'c', imageDescription: 'A cute cat', distractors: ['dog', 'bird', 'fish'] },
      { word: 'sun', phoneme: 's', imageDescription: 'Bright sunshine', distractors: ['moon', 'star', 'cloud'] },
    ],
    instructions: 'Listen and find the matching picture!',
    encouragement: ['Great ears!', 'You got it!', 'Super listening!']
  } as GeneratedPhonicLevel,
  
  math: {
    theme: 'Number Adventure',
    story: 'Solve math puzzles to unlock the treasure!',
    problems: [
      { question: '2 + 3 = ?', answer: 5, context: 'Add them up!', wrongAnswers: [4, 6, 7] },
      { question: '8 - 3 = ?', answer: 5, context: 'Take away!', wrongAnswers: [4, 6, 3] },
    ],
    character: 'Math Wizard',
    encouragement: ['Brilliant!', 'Math star!', 'Perfect!']
  } as GeneratedMathLevel,
  
  rhythm: {
    theme: 'Dance Party',
    letters: ['D', 'A', 'N', 'C', 'E'],
    story: 'Catch the letters to the beat!',
    beatPattern: '1-2-1-2-1',
    encouragement: ['Great rhythm!', 'Keep dancing!', 'Perfect beat!']
  } as GeneratedRhythmLevel,
  
  memory: {
    theme: 'Star Gazing',
    constellation: {
      name: 'The Big Star',
      story: 'A magical star pattern in the night sky',
      points: 5
    },
    hints: ['Start from the brightest point', 'Connect in order'],
    encouragement: ['Great memory!', 'You remembered!', 'Star mapper!']
  } as GeneratedMemoryLevel,
};
