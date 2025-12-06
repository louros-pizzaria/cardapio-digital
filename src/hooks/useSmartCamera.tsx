import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CameraCapture {
  image: string;
  timestamp: string;
  analysis?: FoodAnalysis;
}

interface FoodAnalysis {
  detected_foods: string[];
  confidence: number;
  suggested_menu_items: any[];
  nutritional_info?: any;
}

export const useSmartCamera = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [captures, setCaptures] = useState<CameraCapture[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Erro ao acessar câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsOpen(false);
  }, [stream]);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    const capture: CameraCapture = {
      image: imageData,
      timestamp: new Date().toISOString()
    };

    setCaptures(prev => [capture, ...prev]);
    
    // Analyze the captured image
    await analyzeImage(imageData, capture);

  }, []);

  const analyzeImage = async (imageData: string, capture: CameraCapture) => {
    setIsAnalyzing(true);
    try {
      // Remove data URL prefix
      const base64Image = imageData.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('image-recognition', {
        body: {
          image: base64Image,
          analysis_type: 'food_detection'
        }
      });

      if (data && !error) {
        const analysis: FoodAnalysis = data;
        
        // Update capture with analysis
        setCaptures(prev => 
          prev.map(c => 
            c.timestamp === capture.timestamp 
              ? { ...c, analysis }
              : c
          )
        );

        toast({
          title: "Análise concluída!",
          description: `Detectamos ${analysis.detected_foods.length} alimentos. Veja as sugestões!`
        });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar a imagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scanIngredients = useCallback(async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      const base64Image = imageData.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('image-recognition', {
        body: {
          image: base64Image,
          analysis_type: 'ingredient_detection'
        }
      });

      if (data && !error) {
        return data.ingredients || [];
      }
      return [];
    } catch (error) {
      console.error('Error scanning ingredients:', error);
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getRecipeSuggestions = async (ingredients: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('recipe-suggestions', {
        body: {
          ingredients,
          preferences: JSON.parse(localStorage.getItem('user_preferences') || '{}')
        }
      });

      return data?.recipes || [];
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      return [];
    }
  };

  const clearCaptures = () => {
    setCaptures([]);
  };

  return {
    isOpen,
    isAnalyzing,
    captures,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureImage,
    scanIngredients,
    getRecipeSuggestions,
    clearCaptures
  };
};