'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { analyzeSubitizing } from '@/lib/biometrics/timing-metrics';

interface CricketForgeProps {
  onComplete: (metrics: {
    subitizingThreshold: number;
    subitizingFailed: boolean;
    symbolicMappingSpeed: number;
    accuracy: number;
  }) => void;
}

interface Order {
  id: string;
  customer: string;
  emoji: string;
  items: { item: string; emoji: string; quantity: number; price: number }[];
  total: number;
}

interface OrderOption {
  value: number;
  label: string;
}

const CUSTOMERS = [
  { name: 'Happy Kid', emoji: '😊' },
  { name: 'Hungry Student', emoji: '🎓' },
  { name: 'Party Family', emoji: '👨‍👩‍👧‍👦' },
  { name: 'Office Worker', emoji: '💼' },
  { name: 'Sports Team', emoji: '⚽' },
  { name: 'Gamer', emoji: '🎮' },
];

const PIZZA_ITEMS = [
  { item: 'Pizza', emoji: '🍕', price: 3 },
  { item: 'Burger', emoji: '🍔', price: 5 },
  { item: 'Fries', emoji: '🍟', price: 2 },
  { item: 'Ice Cream', emoji: '🍦', price: 4 },
  { item: 'Juice', emoji: '🧃', price: 2 },
  { item: 'Cookie', emoji: '🍪', price: 1 },
  { item: 'Hotdog', emoji: '🌭', price: 3 },
  { item: 'Taco', emoji: '🌮', price: 4 },
];

const TOTAL_ROUNDS = 8;

export default function CricketForge({ onComplete }: CricketForgeProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [gamePhase, setGamePhase] = useState<'order' | 'answer' | 'feedback'>('order');
  
  // Current order
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerOptions, setAnswerOptions] = useState<OrderOption[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  // Metrics
  const [results, setResults] = useState<{
    orderTotal: number;
    playerAnswer: number;
    responseTime: number;
    correct: boolean;
  }[]>([]);
  
  const orderStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { startSession, endSession, addEvent, updateMetrics } = useSessionStore();
  
  // Start session on mount
  useEffect(() => {
    startSession('cricket-forge');
  }, [startSession]);

  // Generate pizza order
  const generateOrder = useCallback(() => {
    const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    const numItems = Math.min(Math.floor(currentRound / 2) + 2, 4); // 2-4 items
    const items: { item: string; emoji: string; quantity: number; price: number }[] = [];
    let total = 0;
    
    // Pick random items
    const availableItems = [...PIZZA_ITEMS];
    for (let i = 0; i < numItems; i++) {
      const itemIndex = Math.floor(Math.random() * availableItems.length);
      const selectedItem = availableItems.splice(itemIndex, 1)[0];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 of each item
      
      items.push({
        item: selectedItem.item,
        emoji: selectedItem.emoji,
        quantity,
        price: selectedItem.price,
      });
      
      total += selectedItem.price * quantity;
    }
    
    // Generate answer options
    const options: OrderOption[] = [
      { value: total, label: `$${total}` }
    ];
    
    // Add 3 distractors
    const usedValues = new Set([total]);
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 6) + 1;
      const distractor = Math.random() > 0.5 ? total + offset : Math.max(1, total - offset);
      if (!usedValues.has(distractor)) {
        usedValues.add(distractor);
        options.push({ value: distractor, label: `$${distractor}` });
      }
    }
    
    const order: Order = {
      id: `order-${Date.now()}`,
      customer: customer.name,
      emoji: customer.emoji,
      items,
      total,
    };
    
    setCurrentOrder(order);
    setAnswerOptions(options.sort(() => Math.random() - 0.5));
    setGamePhase('order');
    setSelectedAnswer(null);
    setTimeLeft(10);
    orderStartTimeRef.current = Date.now();
    
    // Start countdown
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    addEvent({
      type: 'order-start',
      data: { round: currentRound, total: order.total, items: numItems }
    });
  }, [currentRound, addEvent]);

  // Handle timeout
  const handleTimeout = () => {
    setHearts(prev => prev - 1);
    setFeedback('wrong');
    setGamePhase('feedback');
    
    if (currentOrder) {
      results.push({
        orderTotal: currentOrder.total,
        playerAnswer: -1,
        responseTime: 10000,
        correct: false,
      });
    }
    
    setTimeout(() => {
      if (hearts <= 1 || currentRound >= TOTAL_ROUNDS - 1) {
        finishGame();
      } else {
        setCurrentRound(prev => prev + 1);
        setFeedback(null);
        generateOrder();
      }
    }, 2000);
  };

  // Handle answer selection
  const handleAnswer = (value: number) => {
    if (gamePhase !== 'order' || !currentOrder) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const responseTime = Date.now() - orderStartTimeRef.current;
    const correct = value === currentOrder.total;
    
    setSelectedAnswer(value);
    setFeedback(correct ? 'correct' : 'wrong');
    setGamePhase('feedback');
    
    if (correct) {
      setScore(prev => prev + Math.floor((timeLeft / 10) * 100));
    } else {
      setHearts(prev => prev - 1);
    }
    
    results.push({
      orderTotal: currentOrder.total,
      playerAnswer: value,
      responseTime,
      correct,
    });
    
    addEvent({
      type: 'answer-submitted',
      data: { correct, responseTime, round: currentRound }
    });
    
    setTimeout(() => {
      if (hearts <= 1 && !correct) {
        finishGame();
      } else if (currentRound >= TOTAL_ROUNDS - 1) {
        finishGame();
      } else {
        setCurrentRound(prev => prev + 1);
        setFeedback(null);
        generateOrder();
      }
    }, 2000);
  };

  // Finish game
  const finishGame = () => {
    setIsComplete(true);
    setGamePhase('feedback');
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    const correctAnswers = results.filter(r => r.correct).length;
    const accuracy = (correctAnswers / results.length) * 100;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    const responseTimes = results.map(r => ({ responseTime: r.responseTime, quantity: r.orderTotal }));
    const subitizingAnalysis = analyzeSubitizing(responseTimes);
    
    const metrics = {
      subitizingThreshold: subitizingAnalysis.threshold,
      subitizingFailed: subitizingAnalysis.subitizingFailed,
      symbolicMappingSpeed: avgResponseTime,
      accuracy,
    };
    
    updateMetrics(metrics);
    endSession();
    
    onComplete(metrics);
  };

  // Start game
  const handleStart = () => {
    setIsPlaying(true);
    setCurrentRound(0);
    setScore(0);
    setHearts(3);
    setResults([]);
    setFeedback(null);
    startSession('cricket');
    
    setTimeout(() => {
      generateOrder();
    }, 500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isPlaying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl">
          <div className="text-7xl mb-4">🍕</div>
          <h1 className="text-4xl font-bold text-orange-600 mb-4">Pizza Party!</h1>
          <p className="text-xl text-gray-700 mb-2">Help run the pizza shop!</p>
          <p className="text-lg text-gray-600 mb-8">
            Customers will order food. Calculate the total cost quickly!
          </p>
          
          <div className="bg-orange-100 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-orange-700 mb-4">Menu Prices:</h3>
            <div className="grid grid-cols-2 gap-3 text-left">
              {PIZZA_ITEMS.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <span className="text-2xl mr-2">{item.emoji}</span>
                  <span className="text-gray-700 flex-1">{item.item}</span>
                  <span className="font-bold text-green-600">${item.price}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleStart}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg"
          >
            🎮 Start Serving!
          </button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correctAnswers = results.filter(r => r.correct).length;
    const accuracy = (correctAnswers / results.length) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center shadow-2xl">
          <div className="text-7xl mb-4">
            {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '💫'}
          </div>
          <h2 className="text-4xl font-bold text-orange-600 mb-4">
            {accuracy >= 80 ? 'Outstanding!' : accuracy >= 60 ? 'Great Job!' : 'Good Try!'}
          </h2>
          <p className="text-2xl text-gray-700 mb-8">
            Final Score: <span className="font-bold text-orange-600">{score}</span>
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-100 rounded-xl p-4">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm text-gray-600">Correct Orders</div>
              <div className="text-2xl font-bold text-green-600">{correctAnswers}/{results.length}</div>
            </div>
            <div className="bg-blue-100 rounded-xl p-4">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm text-gray-600">Accuracy</div>
              <div className="text-2xl font-bold text-blue-600">{Math.round(accuracy)}%</div>
            </div>
          </div>
          
          <div className="text-gray-600 text-sm">Saving results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-sm text-gray-600">Order #{currentRound + 1}/{TOTAL_ROUNDS}</div>
            <div className="text-3xl font-bold text-orange-600">{score} pts</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl">⏱️</div>
            <div className={`text-3xl font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-orange-600'}`}>
              {timeLeft}s
            </div>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-3xl">
                {i < hearts ? '❤️' : '🖤'}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Order */}
        {currentOrder && gamePhase === 'order' && (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6">
              <div className="text-6xl mb-2">{currentOrder.emoji}</div>
              <div className="text-2xl font-bold text-gray-800">{currentOrder.customer}</div>
              <div className="text-lg text-gray-600 mt-2">wants to order:</div>
            </div>

            {/* Order Items */}
            <div className="bg-yellow-50 rounded-2xl p-6 border-4 border-yellow-200">
              <div className="space-y-3">
                {currentOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-xl p-4 shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{item.emoji}</span>
                      <div>
                        <div className="font-bold text-gray-800">{item.item}</div>
                        <div className="text-sm text-gray-600">${item.price} each</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">×{item.quantity}</div>
                      <div className="text-sm text-gray-600">= ${item.price * item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700 mb-6">What's the total cost?</div>
              <div className="grid grid-cols-2 gap-4">
                {answerOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-6 px-8 rounded-2xl text-3xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {gamePhase === 'feedback' && currentOrder && (
          <div className="text-center py-12">
            <div className="text-8xl mb-6 animate-bounce">
              {feedback === 'correct' ? '🎉' : '😅'}
            </div>
            <div className="text-4xl font-bold mb-4">
              {feedback === 'correct' ? 'Correct!' : 'Oops!'}
            </div>
            {feedback === 'wrong' && (
              <div className="text-2xl text-gray-700 mb-4">
                The correct total was <span className="font-bold text-green-600">${currentOrder.total}</span>
              </div>
            )}
            {selectedAnswer !== null && (
              <div className="text-xl text-gray-600">
                You answered: <span className="font-bold">${selectedAnswer}</span>
              </div>
            )}
            {!isComplete && (
              <div className="text-lg text-gray-500 mt-6">
                {hearts > 1 || feedback === 'correct' ? 'Next customer coming...' : 'Game Over!'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
