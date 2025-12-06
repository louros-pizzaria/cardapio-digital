import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChefHat, 
  Utensils, 
  Heart, 
  Zap, 
  Clock, 
  MapPin, 
  Sparkles,
  ArrowRight,
  Check,
  Brain,
  Camera,
  Mic
} from 'lucide-react';
import { useNeuralPersonalization } from '@/hooks/useNeuralPersonalization';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

interface TasteProfileData {
  flavors: string[];
  spiceLevel: number;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  mealTiming: string[];
  budgetRange: string;
}

const IntelligentOnboarding: React.FC<{ onComplete: (data: TasteProfileData) => void }> = ({ 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<Partial<TasteProfileData>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { updatePreferences, buildTasteProfile } = useNeuralPersonalization();
  const { haptics } = useHapticFeedback();
  const { toast } = useToast();

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo à Experiência Premium!',
      description: 'Vamos criar seu perfil gastronômico personalizado com IA',
      icon: Sparkles,
      component: WelcomeStep
    },
    {
      id: 'flavors',
      title: 'Seus Sabores Favoritos',
      description: 'Selecione os sabores que mais te atraem',
      icon: Heart,
      component: FlavorStep
    },
    {
      id: 'spice',
      title: 'Nível de Tempero',
      description: 'Como você gosta do seu tempero?',
      icon: Zap,
      component: SpiceStep
    },
    {
      id: 'dietary',
      title: 'Restrições Alimentares',
      description: 'Alguma restrição ou preferência especial?',
      icon: ChefHat,
      component: DietaryStep
    },
    {
      id: 'timing',
      title: 'Horários de Pedido',
      description: 'Quando você costuma pedir comida?',
      icon: Clock,
      component: TimingStep
    },
    {
      id: 'ai-analysis',
      title: 'Análise Neural',
      description: 'Nossa IA está criando seu perfil personalizado',
      icon: Brain,
      component: AIAnalysisStep
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = (stepData: any) => {
    haptics.navigation();
    setProfileData(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsAnalyzing(true);
    haptics.orderConfirmed();
    
    try {
      // Update user preferences with collected data
      await updatePreferences({
        taste_profile: profileData.flavors || [],
        dietary_restrictions: profileData.dietaryRestrictions || [],
        preferred_flavors: profileData.flavors || [],
        spice_level: profileData.spiceLevel || 3,
        price_sensitivity: profileData.budgetRange || 'medium',
        ordering_patterns: {
          meal_timing: profileData.mealTiming,
          cuisine_preferences: profileData.cuisinePreferences
        }
      });

      // Build taste profile from any existing order history
      await buildTasteProfile();

      toast({
        title: "Perfil criado com sucesso! 🎉",
        description: "Sua experiência personalizada está pronta!"
      });

      onComplete(profileData as TasteProfileData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Erro ao salvar perfil",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-3 rounded-full">
              <currentStepData.icon className="h-6 w-6 text-white" />
            </div>
            <Badge variant="secondary" className="text-sm">
              Passo {currentStep + 1} de {steps.length}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepData.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {currentStepData.description}
          </p>
          <Progress value={progress} className="max-w-md mx-auto" />
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <CurrentStepComponent 
              onNext={handleNext}
              data={profileData}
              isAnalyzing={isAnalyzing}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Individual Step Components
const WelcomeStep: React.FC<{ onNext: (data: any) => void }> = ({ onNext }) => {
  const { haptics } = useHapticFeedback();

  return (
    <div className="text-center space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 p-8 rounded-2xl text-white">
        <Sparkles className="h-16 w-16 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Experiência Gastronômica Premium</h2>
        <p className="text-white/90">
          Nossa IA vai aprender seus gostos para criar o menu perfeito para você
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 py-6">
        <div className="text-center">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
            <Brain className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-sm font-medium">IA Personalizada</p>
        </div>
        <div className="text-center">
          <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
            <Camera className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-sm font-medium">Smart Camera</p>
        </div>
        <div className="text-center">
          <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
            <Mic className="h-8 w-8 text-yellow-600" />
          </div>
          <p className="text-sm font-medium">Comandos de Voz</p>
        </div>
      </div>

      <Button 
        onClick={() => {
          haptics.buttonTap();
          onNext({});
        }}
        className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-lg py-6"
      >
        Vamos Começar!
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
};

const FlavorStep: React.FC<{ onNext: (data: any) => void, data: any }> = ({ onNext, data }) => {
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(data.flavors || []);
  const { haptics } = useHapticFeedback();

  const flavors = [
    { id: 'margherita', name: 'Margherita', emoji: '🍅' },
    { id: 'pepperoni', name: 'Pepperoni', emoji: '🍕' },
    { id: 'vegetarian', name: 'Vegetariana', emoji: '🥬' },
    { id: 'meat', name: 'Carnes', emoji: '🥓' },
    { id: 'seafood', name: 'Frutos do Mar', emoji: '🦐' },
    { id: 'cheese', name: 'Queijos Especiais', emoji: '🧀' },
    { id: 'spicy', name: 'Picante', emoji: '🌶️' },
    { id: 'sweet', name: 'Doce', emoji: '🍯' },
    { id: 'herbs', name: 'Ervas', emoji: '🌿' },
    { id: 'exotic', name: 'Exótico', emoji: '🌟' }
  ];

  const toggleFlavor = (flavorId: string) => {
    haptics.selection();
    setSelectedFlavors(prev => 
      prev.includes(flavorId)
        ? prev.filter(id => id !== flavorId)
        : [...prev, flavorId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {flavors.map(flavor => (
          <button
            key={flavor.id}
            onClick={() => toggleFlavor(flavor.id)}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedFlavors.includes(flavor.id)
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
            }`}
          >
            <div className="text-2xl mb-1">{flavor.emoji}</div>
            <div className="text-sm font-medium">{flavor.name}</div>
            {selectedFlavors.includes(flavor.id) && (
              <Check className="h-4 w-4 text-red-600 mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>

      <Button 
        onClick={() => onNext({ flavors: selectedFlavors })}
        disabled={selectedFlavors.length === 0}
        className="w-full"
      >
        Continuar ({selectedFlavors.length} selecionados)
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const SpiceStep: React.FC<{ onNext: (data: any) => void, data: any }> = ({ onNext, data }) => {
  const [spiceLevel, setSpiceLevel] = useState(data.spiceLevel || 3);
  const { haptics } = useHapticFeedback();

  const spiceLevels = [
    { level: 1, name: 'Suave', emoji: '😌', description: 'Sem pimenta' },
    { level: 2, name: 'Leve', emoji: '🙂', description: 'Pouco tempero' },
    { level: 3, name: 'Médio', emoji: '😋', description: 'Equilibrado' },
    { level: 4, name: 'Picante', emoji: '🌶️', description: 'Bem temperado' },
    { level: 5, name: 'Extremo', emoji: '🔥', description: 'Muito picante' }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {spiceLevels.map(level => (
          <button
            key={level.level}
            onClick={() => {
              haptics.selection();
              setSpiceLevel(level.level);
            }}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              spiceLevel === level.level
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{level.emoji}</span>
                <div>
                  <div className="font-medium">{level.name}</div>
                  <div className="text-sm text-gray-600">{level.description}</div>
                </div>
              </div>
              {spiceLevel === level.level && (
                <Check className="h-5 w-5 text-red-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <Button 
        onClick={() => onNext({ spiceLevel })}
        className="w-full"
      >
        Continuar
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const DietaryStep: React.FC<{ onNext: (data: any) => void, data: any }> = ({ onNext, data }) => {
  const [restrictions, setRestrictions] = useState<string[]>(data.dietaryRestrictions || []);
  const { haptics } = useHapticFeedback();

  const dietaryOptions = [
    { id: 'none', name: 'Nenhuma restrição', emoji: '🍽️' },
    { id: 'vegetarian', name: 'Vegetariano', emoji: '🥗' },
    { id: 'vegan', name: 'Vegano', emoji: '🌱' },
    { id: 'gluten-free', name: 'Sem glúten', emoji: '🌾' },
    { id: 'lactose-free', name: 'Sem lactose', emoji: '🥛' },
    { id: 'low-sodium', name: 'Pouco sódio', emoji: '🧂' },
    { id: 'keto', name: 'Cetogênica', emoji: '🥑' },
    { id: 'halal', name: 'Halal', emoji: '☪️' }
  ];

  const toggleRestriction = (restrictionId: string) => {
    haptics.selection();
    if (restrictionId === 'none') {
      setRestrictions(['none']);
    } else {
      setRestrictions(prev => {
        const filtered = prev.filter(id => id !== 'none');
        return prev.includes(restrictionId)
          ? filtered.filter(id => id !== restrictionId)
          : [...filtered, restrictionId];
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3">
        {dietaryOptions.map(option => (
          <button
            key={option.id}
            onClick={() => toggleRestriction(option.id)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              restrictions.includes(option.id)
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.emoji}</span>
                <span className="font-medium">{option.name}</span>
              </div>
              {restrictions.includes(option.id) && (
                <Check className="h-5 w-5 text-red-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <Button 
        onClick={() => onNext({ dietaryRestrictions: restrictions })}
        className="w-full"
      >
        Continuar
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const TimingStep: React.FC<{ onNext: (data: any) => void, data: any }> = ({ onNext, data }) => {
  const [timings, setTimings] = useState<string[]>(data.mealTiming || []);
  const { haptics } = useHapticFeedback();

  const timingOptions = [
    { id: 'breakfast', name: 'Café da manhã', emoji: '🌅', time: '7h - 10h' },
    { id: 'lunch', name: 'Almoço', emoji: '☀️', time: '11h - 14h' },
    { id: 'afternoon', name: 'Lanche da tarde', emoji: '🌤️', time: '15h - 17h' },
    { id: 'dinner', name: 'Jantar', emoji: '🌙', time: '18h - 22h' },
    { id: 'late-night', name: 'Madrugada', emoji: '🌜', time: '23h - 2h' }
  ];

  const toggleTiming = (timingId: string) => {
    haptics.selection();
    setTimings(prev => 
      prev.includes(timingId)
        ? prev.filter(id => id !== timingId)
        : [...prev, timingId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {timingOptions.map(option => (
          <button
            key={option.id}
            onClick={() => toggleTiming(option.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              timings.includes(option.id)
                ? 'border-red-500 bg-red-50 shadow-md'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.emoji}</span>
                <div>
                  <div className="font-medium">{option.name}</div>
                  <div className="text-sm text-gray-600">{option.time}</div>
                </div>
              </div>
              {timings.includes(option.id) && (
                <Check className="h-5 w-5 text-red-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <Button 
        onClick={() => onNext({ mealTiming: timings })}
        disabled={timings.length === 0}
        className="w-full"
      >
        Continuar ({timings.length} selecionados)
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const AIAnalysisStep: React.FC<{ onNext: (data: any) => void, isAnalyzing: boolean }> = ({ 
  onNext, 
  isAnalyzing 
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => onNext({}), 1000);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isAnalyzing, onNext]);

  return (
    <div className="text-center space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-2xl text-white">
        <Brain className="h-16 w-16 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">Análise Neural em Progresso</h2>
        <p className="text-white/90">
          Nossa IA está processando suas preferências para criar o perfil perfeito
        </p>
      </div>
      
      <div className="space-y-4">
        <Progress value={progress} className="h-3" />
        <div className="text-sm text-gray-600">
          {progress < 30 && "Analisando preferências de sabor..."}
          {progress >= 30 && progress < 60 && "Criando perfil gastronômico..."}
          {progress >= 60 && progress < 90 && "Preparando recomendações personalizadas..."}
          {progress >= 90 && "Finalizando configuração..."}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center">
          <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-xs">Sabores</p>
        </div>
        <div className="text-center">
          <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-xs">Restrições</p>
        </div>
        <div className="text-center">
          <div className={`p-3 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center ${
            progress >= 90 ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {progress >= 90 ? (
              <Check className="h-6 w-6 text-green-600" />
            ) : (
              <Brain className="h-6 w-6 text-gray-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs">IA</p>
        </div>
      </div>
    </div>
  );
};

export default IntelligentOnboarding;