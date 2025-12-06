import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pizza, Clock, Shield, Star, Users, Truck, Gift, ChevronDown, ChevronUp, Sparkles, Zap, Target, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useEffect, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
const Index = () => {
  const navigate = useNavigate();
  const {
    user
  } = useUnifiedAuth();
  const [pizzasPerYear, setPizzasPerYear] = useState(10);
  useEffect(() => {
    document.title = '🍕 Clube da Pizza - Rei da Pizza Paraty | Desconto Vitalício';
  }, []);
  const handleSubscribe = () => {
    if (user) {
      navigate('/plans');
    } else {
      navigate('/auth');
    }
  };
  const normalCost = pizzasPerYear * 100;
  const memberCost = pizzasPerYear * 80 + 99;
  const savings = normalCost - memberCost;
  const benefits = [{
    icon: Target,
    text: "R$20 de desconto em toda pizza (sem limite)"
  }, {
    icon: Truck,
    text: "Prioridade no delivery → entrega em até 30 minutos"
  }, {
    icon: Sparkles,
    text: "Sabores secretos e combos exclusivos"
  }, {
    icon: Gift,
    text: "Brindes semanais → borda recheada grátis"
  }, {
    icon: Pizza,
    text: "Todo o cardápio mais barato"
  }, {
    icon: Shield,
    text: "Exclusivo para moradores de Paraty-RJ"
  }];
  const faqs = [{
    question: "O desconto é mesmo vitalício?",
    answer: "Sim! Quem assinar agora trava o benefício e terá R$20 OFF em cada pizza para sempre."
  }, {
    question: "E se eu não quiser renovar depois?",
    answer: "Sem problema. A assinatura é anual e você pode cancelar a renovação a qualquer momento."
  }, {
    question: "Funciona em todo o cardápio?",
    answer: "Sim! Todas as pizzas grandes do cardápio participam."
  }, {
    question: "Sou turista, posso participar?",
    answer: "Não. O Clube é exclusivo para moradores de Paraty."
  }];
  return <div className="min-h-screen bg-background">
      {/* Header Minimalista */}
      <header className="glass sticky top-0 z-50 border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[hsl(var(--pizza-red))] p-2.5 rounded-xl shadow-soft">
              <Pizza className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">🍕 Clube da Pizza</h1>
              <p className="text-xs text-muted-foreground">Rei da Pizza • Paraty</p>
            </div>
          </div>
          <Button onClick={handleSubscribe} className="bg-[hsl(var(--pizza-red))] hover:bg-[hsl(var(--pizza-red))]/90 text-primary-foreground shadow-soft hover-lift">
            {user ? 'Assinar Agora' : 'Entrar'}
          </Button>
        </div>
      </header>

      {/* Hero Section - Headline Matadora */}
      <section className="gradient-primary text-primary-foreground py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse-glow"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <Badge className="bg-[hsl(var(--pizza-gold))] text-pizza-dark mb-6 text-sm px-4 py-2 shadow-medium hover-bounce">
            🔥 LANÇAMENTO EXCLUSIVO - VAGAS LIMITADAS
          </Badge>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            A MAIOR OPORTUNIDADE DA<br />
            HISTÓRIA DA REI DA PIZZA CHEGOU:
            <br />
            <span className="text-[hsl(var(--pizza-gold))] drop-shadow-lg">
              DESCONTO VITALÍCIO EM TODA PIZZA
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-4 text-primary-foreground/90 font-medium">
            Só para moradores de Paraty.
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-2xl mx-auto mb-8">
            <p className="text-2xl md:text-3xl font-bold mb-2">
              Pague apenas <span className="text-[hsl(var(--pizza-gold))]">R$ 99/ano</span>
            </p>
            <p className="text-lg md:text-xl">
              e tenha <span className="font-bold text-[hsl(var(--pizza-gold))]">R$20 de desconto</span> em cada pizza, para sempre.
            </p>
            <p className="text-sm mt-3 text-primary-foreground/80">
              ⚠️ Essa oferta única só existe no lançamento. Depois, nunca mais.
            </p>
          </div>

          <Button size="lg" onClick={handleSubscribe} className="bg-white text-[hsl(var(--pizza-red))] hover:bg-white/90 text-xl px-12 py-7 shadow-hard hover-glow font-bold">
            ASSINE AGORA
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* Benefícios Principais */}
      <section className="py-16 md:py-20 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Trophy className="h-12 w-12 text-[hsl(var(--pizza-red))] mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Por que entrar no Clube da Pizza hoje?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => <Card key={index} className="border-border shadow-soft hover-lift bg-card">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="bg-[hsl(var(--pizza-red))]/10 p-3 rounded-lg flex-shrink-0">
                    <benefit.icon className="h-6 w-6 text-[hsl(var(--pizza-red))]" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{benefit.text}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Calculadora de Economia */}
      

      {/* Prova Social */}
      <section className="py-12 bg-accent/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div className="hover-lift">
              <div className="text-4xl font-black text-[hsl(var(--pizza-red))] mb-2">+200</div>
              <p className="text-sm text-muted-foreground">Clientes na lista de espera</p>
            </div>
            <div className="hover-lift">
              <div className="text-4xl font-black text-[hsl(var(--pizza-red))] mb-2 flex items-center justify-center gap-1">
                4.9 <Star className="h-6 w-6 fill-[hsl(var(--pizza-gold))] text-[hsl(var(--pizza-gold))]" />
              </div>
              <p className="text-sm text-muted-foreground">Nota no app próprio</p>
            </div>
            <div className="hover-lift">
              <div className="text-4xl font-black text-[hsl(var(--pizza-red))] mb-2">SUPER</div>
              <p className="text-sm text-muted-foreground">Reconhecida no iFood</p>
            </div>
            <div className="hover-lift">
              <div className="text-4xl font-black text-[hsl(var(--pizza-red))] mb-2 flex items-center justify-center gap-2">
                <Clock className="h-8 w-8" /> 30min
              </div>
              <p className="text-sm text-muted-foreground">A mais rápida de Paraty</p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-12 glass p-6 rounded-xl border border-border/40">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💬</div>
              <div>
                <p className="text-foreground italic mb-2">
                  "A melhor pizza da cidade, e agora com desconto vitalício pros clientes fiéis. Inacreditável!"
                </p>
                <p className="text-sm text-muted-foreground">— Cliente da Rei da Pizza</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              ❓ Perguntas Frequentes
            </h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6 shadow-soft bg-card">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    👉 {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>)}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Urgência - Vagas Limitadas */}
      <section className="py-16 bg-[hsl(var(--pizza-red))]/10 border-y-4 border-[hsl(var(--pizza-red))]">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-block bg-[hsl(var(--pizza-red))] text-primary-foreground px-6 py-3 rounded-full font-bold text-lg mb-6 shadow-medium animate-bounce-in">
              🚨 ATENÇÃO: VAGAS LIMITADAS
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Para manter a exclusividade, estamos liberando o Clube apenas para um grupo inicial de moradores.
            </h2>
            <p className="text-xl text-[hsl(var(--pizza-red))] font-bold">
              Depois que fechar, acabou.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            🍕 Não perca essa chance única:
          </h2>
          <p className="text-2xl md:text-3xl font-bold mb-8 text-[hsl(var(--pizza-gold))]">
            "ASSINE AGORA E GARANTA SEU DESCONTO VITALÍCIO"
          </p>
          <Button size="lg" onClick={handleSubscribe} className="bg-white text-[hsl(var(--pizza-red))] hover:bg-white/90 text-2xl px-16 py-8 shadow-hard hover-glow font-black">
            ASSINE AGORA
            <Sparkles className="ml-3 h-7 w-7" />
          </Button>
          <p className="text-sm mt-6 text-primary-foreground/80">
            ✅ Sem compromisso • ✅ Desconto vitalício • ✅ Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(var(--pizza-dark))] text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <Pizza className="h-6 w-6" />
                <span className="font-bold">Clube da Pizza</span>
              </div>
              <p className="text-sm text-primary-foreground/70">
                Rei da Pizza - Paraty, RJ
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li>📍 Paraty - RJ</li>
                <li>📞 WhatsApp: (24) 99999-9999</li>
                <li>🕒 Entrega em até 30 minutos</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Sobre</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li>Nota 4.9 ⭐</li>
                <li>Super no iFood 🏆</li>
                <li>+200 clientes na lista ❤️</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
            <p>&copy; 2024 Clube da Pizza - Rei da Pizza Paraty. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;