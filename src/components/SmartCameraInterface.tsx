import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  ScanLine, 
  Sparkles, 
  X, 
  RotateCcw,
  Upload,
  Zap,
  ChefHat,
  Eye,
  Mic
} from 'lucide-react';
import { useSmartCamera } from '@/hooks/useSmartCamera';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';

interface SmartCameraInterfaceProps {
  onFoodDetected?: (analysis: any) => void;
  onClose?: () => void;
  mode?: 'food_recognition' | 'ingredient_scan' | 'nutrition_analysis';
}

const SmartCameraInterface: React.FC<SmartCameraInterfaceProps> = ({
  onFoodDetected,
  onClose,
  mode = 'food_recognition'
}) => {
  const {
    isOpen,
    isAnalyzing,
    captures,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureImage,
    scanIngredients,
    getRecipeSuggestions
  } = useSmartCamera();
  
  const { haptics } = useHapticFeedback();
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    haptics.cameraCaptured();
    await captureImage();
    
    // Process the latest capture
    if (captures.length > 0) {
      const latestCapture = captures[0];
      if (latestCapture.analysis) {
        setAnalysisResults(prev => [latestCapture.analysis, ...prev]);
        onFoodDetected?.(latestCapture.analysis);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    haptics.buttonTap();
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (mode === 'ingredient_scan') {
          const ingredients = await scanIngredients(imageData);
          const recipes = await getRecipeSuggestions(ingredients);
          setAnalysisResults([{ detected_foods: ingredients, suggested_recipes: recipes }]);
        } else {
          // Regular food recognition would happen here
        }
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível processar a imagem.",
        variant: "destructive"
      });
    }
  };

  const startVoiceCommand = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      haptics.voiceStart();
      setIsListening(true);
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
      };
      
      recognition.onerror = () => {
        haptics.voiceError();
        setIsListening(false);
        toast({
          title: "Erro no reconhecimento de voz",
          description: "Tente novamente.",
          variant: "destructive"
        });
      };
      
      recognition.onend = () => {
        haptics.voiceEnd();
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "Reconhecimento de voz não suportado",
        description: "Seu navegador não suporta comandos de voz.",
        variant: "destructive"
      });
    }
  };

  const handleVoiceCommand = (command: string) => {
    if (command.includes('foto') || command.includes('capturar')) {
      handleCapture();
    } else if (command.includes('analisar') || command.includes('escaneio')) {
      handleCapture();
    } else if (command.includes('fechar') || command.includes('sair')) {
      handleClose();
    }
  };

  const handleClose = () => {
    haptics.menuClose();
    stopCamera();
    onClose?.();
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'ingredient_scan':
        return {
          title: 'Scanner de Ingredientes',
          description: 'Aponte para ingredientes e descubra receitas',
          icon: ScanLine,
          color: 'from-green-600 to-emerald-500'
        };
      case 'nutrition_analysis':
        return {
          title: 'Análise Nutricional',
          description: 'Obtenha informações nutricionais instantâneas',
          icon: Eye,
          color: 'from-blue-600 to-cyan-500'
        };
      default:
        return {
          title: 'Reconhecimento de Comida',
          description: 'Fotografe comida e receba sugestões similares',
          icon: ChefHat,
          color: 'from-red-600 to-orange-500'
        };
    }
  };

  const modeConfig = getModeConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-r ${modeConfig.color} p-2 rounded-lg`}>
                <modeConfig.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{modeConfig.title}</CardTitle>
                <p className="text-sm text-gray-600">{modeConfig.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Camera/Upload Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera View */}
            <div className="relative">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <ScanLine className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Analisando...</p>
                    </div>
                  </div>
                )}
                
                {/* Scan Lines Animation */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white opacity-70"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white opacity-70"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white opacity-70"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white opacity-70"></div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="flex justify-center gap-4 mt-4">
                <Button
                  onClick={handleCapture}
                  disabled={isAnalyzing}
                  className={`bg-gradient-to-r ${modeConfig.color} hover:opacity-90 text-white px-8`}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {isAnalyzing ? 'Analisando...' : 'Capturar'}
                </Button>
                
                <Button
                  onClick={startVoiceCommand}
                  disabled={isListening}
                  variant="outline"
                  className="border-2"
                >
                  <Mic className={`h-5 w-5 mr-2 ${isListening ? 'animate-pulse text-red-500' : ''}`} />
                  {isListening ? 'Escutando...' : 'Voz'}
                </Button>
                
                <label className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-5 w-5 mr-2" />
                      Upload
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Resultados da Análise
              </h3>
              
              {analysisResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Capture ou faça upload de uma imagem para começar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisResults.map((result, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        {/* Detected Foods */}
                        {result.detected_foods && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-2">Alimentos Detectados:</h4>
                            <div className="flex flex-wrap gap-1">
                              {result.detected_foods.map((food: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {food}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Suggested Menu Items */}
                        {result.suggested_menu_items && result.suggested_menu_items.length > 0 && (
                          <div className="mb-3">
                            <h4 className="font-medium mb-2">Sugestões do Menu:</h4>
                            <div className="space-y-2">
                              {result.suggested_menu_items.slice(0, 3).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  <Badge className="bg-green-100 text-green-800">
                                    R$ {item.price?.toFixed(2)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Suggested Recipes */}
                        {result.suggested_recipes && result.suggested_recipes.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Receitas Sugeridas:</h4>
                            <div className="space-y-2">
                              {result.suggested_recipes.slice(0, 2).map((recipe: any, i: number) => (
                                <div key={i} className="p-2 bg-orange-50 rounded">
                                  <p className="text-sm font-medium">{recipe.name}</p>
                                  <p className="text-xs text-gray-600">{recipe.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Confidence Score */}
                        {result.confidence && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between items-center text-sm">
                              <span>Confiança:</span>
                              <Badge variant={result.confidence > 0.8 ? 'default' : 'secondary'}>
                                {(result.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feature Hints */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              Dicas Inteligentes
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              {mode === 'food_recognition' && (
                <>
                  <p>• Fotografe pratos prontos para receber sugestões similares do nosso menu</p>
                  <p>• Use comandos de voz: "capturar", "analisar", "fechar"</p>
                </>
              )}
              {mode === 'ingredient_scan' && (
                <>
                  <p>• Aponte para ingredientes para descobrir receitas possíveis</p>
                  <p>• Funciona melhor com ingredientes bem iluminados</p>
                </>
              )}
              {mode === 'nutrition_analysis' && (
                <>
                  <p>• Obtenha informações nutricionais detalhadas de qualquer prato</p>
                  <p>• Ideal para acompanhar sua dieta e objetivos</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartCameraInterface;