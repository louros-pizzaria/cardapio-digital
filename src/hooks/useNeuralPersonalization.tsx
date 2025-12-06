import { useState, useEffect } from 'react';
import { useUnifiedAuth } from './useUnifiedAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferences {
  taste_profile: string[];
  dietary_restrictions: string[];
  preferred_flavors: string[];
  spice_level: number;
  price_sensitivity: string;
  ordering_patterns: any;
  mood_preferences: any;
}

interface MoodAnalysis {
  current_mood: string;
  confidence: number;
  recommended_categories: string[];
  suggested_items: any[];
}

export const useNeuralPersonalization = () => {
  const { user } = useUnifiedAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [moodAnalysis, setMoodAnalysis] = useState<MoodAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...newPreferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (data && !error) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  // Analyze current mood based on interaction patterns
  const analyzeMood = async () => {
    if (!user) return;

    setIsAnalyzing(true);
    try {
      // Call edge function for mood analysis
      const { data, error } = await supabase.functions.invoke('mood-analysis', {
        body: {
          user_id: user.id,
          current_time: new Date().toISOString(),
          interaction_data: {
            page_views: localStorage.getItem('recent_pages'),
            time_spent: localStorage.getItem('session_duration'),
            clicks: localStorage.getItem('click_patterns')
          }
        }
      });

      if (data && !error) {
        setMoodAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing mood:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get personalized recommendations
  const getPersonalizedMenu = async () => {
    if (!user || !preferences) return [];

    try {
      const { data, error } = await supabase.functions.invoke('neural-personalization', {
        body: {
          user_id: user.id,
          preferences,
          mood_analysis: moodAnalysis,
          context: {
            time_of_day: new Date().getHours(),
            day_of_week: new Date().getDay(),
            weather: await getWeatherContext()
          }
        }
      });

      return data?.recommendations || [];
    } catch (error) {
      console.error('Error getting personalized menu:', error);
      return [];
    }
  };

  // Smart taste profiling from order history
  const buildTasteProfile = async () => {
    if (!user) return;

    try {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (*)
          )
        `)
        .eq('user_id', user.id)
        .limit(50);

      if (orders) {
        // Analyze patterns in order history
        const tasteProfile = analyzeOrderPatterns(orders);
        await updatePreferences({ taste_profile: tasteProfile });
      }
    } catch (error) {
      console.error('Error building taste profile:', error);
    }
  };

  const analyzeOrderPatterns = (orders: any[]) => {
    // Smart analysis of ordering patterns
    const flavors: Record<string, number> = {};
    const categories: Record<string, number> = {};
    const timePatterns: Record<string, any[]> = {};

    orders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      
      if (!timePatterns[timeSlot]) timePatterns[timeSlot] = [];
      
      order.order_items?.forEach((item: any) => {
        const product = item.products;
        if (product) {
          // Count flavor preferences
          product.ingredients?.forEach((ingredient: string) => {
            flavors[ingredient] = (flavors[ingredient] || 0) + 1;
          });
          
          timePatterns[timeSlot].push(product);
        }
      });
    });

    return Object.keys(flavors)
      .sort((a, b) => flavors[b] - flavors[a])
      .slice(0, 10);
  };

  const getWeatherContext = async () => {
    // Simple weather context (in production, use a weather API)
    return {
      temperature: Math.random() > 0.5 ? 'hot' : 'cold',
      condition: Math.random() > 0.5 ? 'sunny' : 'rainy'
    };
  };

  return {
    preferences,
    moodAnalysis,
    isAnalyzing,
    loading,
    updatePreferences,
    analyzeMood,
    getPersonalizedMenu,
    buildTasteProfile
  };
};